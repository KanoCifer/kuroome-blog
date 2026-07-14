package mongodb

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

const devTaskCollection = "dev_tasks"

type DevTaskRepository struct {
	db *mongo.Collection
}

func NewDevTaskRepository(db *mongo.Database) *DevTaskRepository {
	return &DevTaskRepository{db: db.Collection(devTaskCollection)}
}

// Create 创建任务；_id 由 mongo-driver 自动生成 ObjectID。
// timestamps 由 service 层设置，repo 只负责持久化。
func (r *DevTaskRepository) Create(ctx context.Context, task *document.DevTask) error {
	res, err := r.db.InsertOne(ctx, task)
	if err != nil {
		return err
	}
	task.ID = res.InsertedID.(bson.ObjectID).Hex()
	return nil
}

// GetBySlug 按 slug（task-N 格式）查询单条任务。
func (r *DevTaskRepository) GetBySlug(ctx context.Context, slug string) (*document.DevTask, error) {
	var task document.DevTask
	err := r.db.FindOne(ctx, bson.M{"slug": slug, "is_deleted": false}).Decode(&task)
	return &task, err
}

// ListFilter 列表查询过滤条件。
type ListFilter struct {
	Status   *document.DevTaskStatus
	Priority *document.DevTaskPriority
	Type     *document.DevTaskType
	IsDeleted *bool
	ForAgent  *bool              // 按"是否可给 agent"过滤
	Kind      *document.TaskKind // 按任务角色过滤：spec / subtask
}

// List 分页列出任务，支持按状态 / 优先级 / 类型过滤。
func (r *DevTaskRepository) List(
	ctx context.Context,
	filter ListFilter,
	page, perPage int,
) ([]document.DevTask, int64, error) {
	where := bson.M{}
	if filter.Status != nil {
		where["status"] = *filter.Status
	}
	if filter.Priority != nil {
		where["priority"] = *filter.Priority
	}
	if filter.Type != nil {
		where["type"] = *filter.Type
	}
	if filter.IsDeleted != nil {
		where["is_deleted"] = *filter.IsDeleted
	} else {
		where["is_deleted"] = false
	}
	if filter.ForAgent != nil {
		where["for_agent"] = *filter.ForAgent
	}
	if filter.Kind != nil {
		where["kind"] = *filter.Kind
	}

	total, err := r.db.CountDocuments(ctx, where)
	if err != nil {
		return nil, 0, err
	}

	sort := bson.D{
		{Key: "sort_order", Value: 1},
		{Key: "created_at", Value: -1},
	}
	skip := int64((page - 1) * perPage)
	opts := options.Find().
		SetSort(sort).
		SetSkip(skip).
		SetLimit(int64(perPage))

	cursor, err := r.db.Find(ctx, where, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var tasks []document.DevTask
	if err := cursor.All(ctx, &tasks); err != nil {
		return nil, 0, err
	}
	return tasks, total, nil
}

// BatchUpdateStatus 批量按 slug 改状态 + touched_at。
// filter 含 slug∈slugs，故只更新匹配的文档。返回 modifiedCount 由 service 层
// 用于构造 succeeded 列表；不在库是因为库不感知"哪些 slug 是 caller 传入的"。
func (r *DevTaskRepository) BatchUpdateStatus(
	ctx context.Context,
	slugs []string,
	status document.DevTaskStatus,
) (modified int64, err error) {
	if len(slugs) == 0 {
		return 0, nil
	}
	res, err := r.db.UpdateMany(
		ctx,
		bson.M{"slug": bson.M{"$in": slugs}, "is_deleted": false},
		bson.M{"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		}},
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

// Update 部分更新任务；fields 已由 service 层组装好（含 updated_at）。
func (r *DevTaskRepository) Update(ctx context.Context, slug string, fields bson.M) error {
	_, err := r.db.UpdateOne(
		ctx,
		bson.M{"slug": slug},
		bson.M{"$set": fields},
	)
	return err
}

// SoftDelete 逻辑删除：置 is_deleted=true 并记录归档时间。
func (r *DevTaskRepository) SoftDelete(ctx context.Context, slug string) error {
	_, err := r.db.UpdateOne(
		ctx,
		bson.M{"slug": slug},
		bson.M{"$set": bson.M{
			"is_deleted":  true,
			"archived_at": time.Now(),
		}},
	)
	return err
}

// ArchiveDoneTasks 批量归档所有"已完成"任务（逻辑删除），返回归档数量。
func (r *DevTaskRepository) ArchiveDoneTasks(ctx context.Context) (int64, error) {
	res, err := r.db.UpdateMany(
		ctx,
		bson.M{"status": document.StatusDone, "is_deleted": false},
		bson.M{"$set": bson.M{
			"is_deleted":  true,
			"archived_at": time.Now(),
		}},
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

// HardDelete 物理删除（永久移除）。
func (r *DevTaskRepository) HardDelete(ctx context.Context, slug string) error {
	_, err := r.db.DeleteOne(ctx, bson.M{"slug": slug})
	return err
}

// NextSlugSeq 自增并返回下一个 slug 序号。
// 用 counters 集合单文档 $inc 保证原子性——并发创建也不会重复。
// 首次调用时文档不存在，$inc 会自动创建（seq 从 1 开始）。
func (r *DevTaskRepository) NextSlugSeq(ctx context.Context) (int, error) {
	const counterID = "devtask_slug"

	res := r.db.Database().Collection("counters").FindOneAndUpdate(
		ctx,
		bson.M{"_id": counterID},
		bson.M{"$inc": bson.M{"seq": 1}},
		options.FindOneAndUpdate().
			SetUpsert(true).
			SetReturnDocument(options.After),
	)

	var doc struct {
		Seq int `bson:"seq"`
	}
	if err := res.Decode(&doc); err != nil {
		return 0, err
	}
	return doc.Seq, nil
}

// FindFrontier 返回 agent 当前可认领的任务。
// 条件: for_agent=true + status=待排期 + blocked_by=空数组 + is_deleted=false。
// 排序沿用 List 的规则 (sort_order ASC, created_at DESC)，默认最多 10 条。
func (r *DevTaskRepository) FindFrontier(ctx context.Context, limit int) ([]document.DevTask, error) {
	where := bson.M{
		"for_agent":  true,
		"status":     document.StatusBacklog,
		"is_deleted": false,
		"blocked_by": bson.M{"$size": 0},
	}

	opts := options.Find().
		SetSort(bson.D{
			{Key: "sort_order", Value: 1},
			{Key: "created_at", Value: -1},
		}).
		SetLimit(int64(limit))

	cursor, err := r.db.Find(ctx, where, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tasks []document.DevTask
	if err := cursor.All(ctx, &tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}
