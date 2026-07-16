package dto



type VersionInfo struct {
	RepoUrl string `json:"repo_url"`
	CurrentVersion string `json:"current_version"`
}

type ServiceInfo struct {
	Runtime string `json:"runtime"`
	Coroutines string `json:"coroutines"`
	GcCount string `json:"gc_count"`
	StartTime string `json:"start_time"`
	HeapMemoryBytes string `json:"heap_memory_bytes"`
	TotalMemoryBytes string `json:"total_memory_bytes"`
	DbOk string `json:"db_ok"`
	ApiOk string `json:"api_ok"`
}

type SystemInfo struct {

}
