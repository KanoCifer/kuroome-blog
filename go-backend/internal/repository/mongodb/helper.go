package mongodb

import (
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func validateObjectID(id string) (oid bson.ObjectID, err error) {
	oid, err = bson.ObjectIDFromHex(id)
	if err != nil {
		return bson.ObjectID{}, errs.ErrInvalidObjectID
	}
	return oid, nil
}
