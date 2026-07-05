package document

type ChangelogItem struct {
	Type    string `bson:"type"`
	Content string `bson:"content"`
}

type Changelog struct {
	Version string           `bson:"version"`
	Date    string           `bson:"date"`
	Title   string           `bson:"title"`
	Changes []ChangelogItem `bson:"changes"`
}
