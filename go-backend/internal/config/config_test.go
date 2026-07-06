package config

import "testing"

func TestSplitAndTrim(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{"single", "a", []string{"a"}},
		{"multiple", "a,b,c", []string{"a", "b", "c"}},
		{"spaces", " a , b , c ", []string{"a", "b", "c"}},
		{"empty", "", []string{}},
		{"trailing comma", "a,b,", []string{"a", "b"}},
		{"only commas", ",,,", []string{}},
		{"mixed empty", "a,,b, ,c", []string{"a", "b", "c"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitAndTrim(tt.in)
			if len(got) != len(tt.want) {
				t.Fatalf("splitAndTrim(%q) = %v, want %v", tt.in, got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("splitAndTrim(%q)[%d] = %q, want %q", tt.in, i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestParseIntList(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []int
	}{
		{"single", "1", []int{1}},
		{"multiple", "1,2,3", []int{1, 2, 3}},
		{"spaces", " 1 , 2 , 3 ", []int{1, 2, 3}},
		{"empty", "", []int{}},
		{"trailing comma", "1,2,", []int{1, 2}},
		{"invalid mixed", "1,abc,3", []int{1, 3}},
		{"only invalid", "abc,def", []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseIntList(tt.in)
			if len(got) != len(tt.want) {
				t.Fatalf("parseIntList(%q) = %v, want %v", tt.in, got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("parseIntList(%q)[%d] = %d, want %d", tt.in, i, got[i], tt.want[i])
				}
			}
		})
	}
}
