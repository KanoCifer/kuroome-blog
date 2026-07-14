package mongodb

import (
	"context"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type FishRepo struct {
	coll *mongo.Collection
}

const FishCollectionName = "fish"

func NewFishRepo(db *mongo.Database) *FishRepo {
	return &FishRepo{
		coll: db.Collection(FishCollectionName),
	}
}

func (r *FishRepo) List(ctx context.Context) ([]*document.FishingSpot, error) {
	cur, err := r.coll.Find(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var spots []*document.FishingSpot
	for cur.Next(ctx) {
		var spot document.FishingSpot
		if err := cur.Decode(&spot); err != nil {
			return nil, err
		}
		spots = append(spots, &spot)
	}
	return spots, nil
}

func (r *FishRepo) Create(ctx context.Context, spot *document.FishingSpot) error {
	_, err := r.coll.InsertOne(ctx, spot)
	if err != nil {
		return err
	}
	return nil
}

func (r *FishRepo) GetByID(ctx context.Context, id string) (*document.FishingSpot, error) {
	oid, err := validateObjectID(id)
	if err != nil {
		return nil, err
	}
	var spot document.FishingSpot
	if err := r.coll.FindOne(ctx, bson.M{"_id": oid}).Decode(&spot); err != nil {
		return nil, err
	}
	return &spot, nil
}

func (r *FishRepo) Update(ctx context.Context, id string, data bson.M) error {
	oid, err := validateObjectID(id)
	if err != nil {
		return err
	}
	_, err = r.coll.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": data})
	if err != nil {
		return err
	}
	return nil
}

func (r *FishRepo) Delete(ctx context.Context, id string, hardDelete ...bool) error {
	hardDeleteFlag := false
	if len(hardDelete) > 0 {
		hardDeleteFlag = hardDelete[0]
	}

	oid, err := validateObjectID(id)
	if err != nil {
		return err
	}
	if hardDeleteFlag {
		_, err = r.coll.DeleteOne(ctx, bson.M{"_id": oid})
	} else {
		_, err = r.coll.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"DeletedAt": time.Now().UTC()}})
	}
	if err != nil {
		return err
	}
	return nil
}
