package monitor

import "github.com/KanoCifer/kuroome-blog/internal/dto"

// pagination is local to monitor so its endpoint semantics stay independent of
// the other service packages' pagination helpers.
func pagination(page, pageSize, total int) dto.Pagination {
	pages := 0
	if pageSize > 0 {
		pages = (total + pageSize - 1) / pageSize
	}
	prev, next := (*int)(nil), (*int)(nil)
	if page > 1 {
		v := page - 1
		prev = &v
	}
	if page < pages {
		v := page + 1
		next = &v
	}
	return dto.Pagination{
		Page: page, PerPage: pageSize, Total: total, Pages: pages,
		HasPrev: page > 1, HasNext: page < pages, PrevNum: prev, NextNum: next,
	}
}
