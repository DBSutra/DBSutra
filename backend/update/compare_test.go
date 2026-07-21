// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package update

import (
	"testing"
)

// ══════════════════════════════════════════════════════════════════════════════
// ParseVersion tests
// ══════════════════════════════════════════════════════════════════════════════

func TestParseVersion(t *testing.T) {
	tests := []struct {
		input   string
		want    Version
		wantErr bool
	}{
		{"v1.2.3", Version{Major: 1, Minor: 2, Patch: 3, Raw: "v1.2.3"}, false},
		{"1.2.3", Version{Major: 1, Minor: 2, Patch: 3, Raw: "1.2.3"}, false},
		{"V1.2.3", Version{Major: 1, Minor: 2, Patch: 3, Raw: "V1.2.3"}, false},
		{"v0.0.1", Version{Major: 0, Minor: 0, Patch: 1, Raw: "v0.0.1"}, false},
		{"v1.2.3-beta.1", Version{Major: 1, Minor: 2, Patch: 3, Raw: "v1.2.3-beta.1"}, false},
		{"v1.2.3+build.456", Version{Major: 1, Minor: 2, Patch: 3, Raw: "v1.2.3+build.456"}, false},
		{"v1.2.3-rc.1+build.789", Version{Major: 1, Minor: 2, Patch: 3, Raw: "v1.2.3-rc.1+build.789"}, false},
		{"v10.20.30", Version{Major: 10, Minor: 20, Patch: 30, Raw: "v10.20.30"}, false},
		{"v1.2", Version{Major: 1, Minor: 2, Patch: 0, Raw: "v1.2"}, false},
		{"v1", Version{Major: 1, Minor: 0, Patch: 0, Raw: "v1"}, false},
		// errors
		{"", Version{}, true},
		{"abc", Version{}, true},
		{"v1.2.x", Version{}, true},
		{"v-1.2.3", Version{}, true},
		{"v1.2.3.4", Version{}, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got, err := ParseVersion(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseVersion(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("ParseVersion(%q) = %+v, want %+v", tt.input, got, tt.want)
			}
		})
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// CompareVersions tests
// ══════════════════════════════════════════════════════════════════════════════

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want int
	}{
		// equal
		{"equal with v", "v1.2.3", "v1.2.3", 0},
		{"equal without v", "1.2.3", "1.2.3", 0},
		{"equal mixed prefix", "v1.2.3", "1.2.3", 0},
		{"equal ignores pre-release", "v1.2.3-alpha", "v1.2.3-beta", 0},

		// a < b (returns -1)
		{"major older", "v1.0.0", "v2.0.0", -1},
		{"minor older", "v1.1.0", "v1.2.0", -1},
		{"patch older", "v1.2.3", "v1.2.4", -1},
		{"major dominates", "v1.9.9", "v2.0.0", -1},
		{"minor dominates", "v1.1.9", "v1.2.0", -1},

		// a > b (returns 1)
		{"major newer", "v2.0.0", "v1.0.0", 1},
		{"minor newer", "v1.2.0", "v1.1.0", 1},
		{"patch newer", "v1.2.4", "v1.2.3", 1},

		// zeros
		{"zero vs zero", "v0.0.0", "v0.0.0", 0},
		{"zero vs one", "v0.0.0", "v0.0.1", -1},

		// large numbers
		{"large major", "v100.0.0", "v99.99.99", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CompareVersions(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("CompareVersions(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestCompareVersions_Fallback(t *testing.T) {
	// When parsing fails, falls back to string comparison
	got := CompareVersions("invalid", "invalid")
	if got != 0 {
		t.Errorf("CompareVersions(invalid, invalid) = %d, want 0", got)
	}

	// "invalid" > "also-invalid" lexicographically ('i' > 'a')
	got = CompareVersions("invalid", "also-invalid")
	if got != 1 {
		t.Errorf("CompareVersions(invalid, also-invalid) = %d, want 1", got)
	}

	got = CompareVersions("abc", "xyz")
	if got != -1 {
		t.Errorf("CompareVersions(abc, xyz) = %d, want -1", got)
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// IsNewer tests
// ══════════════════════════════════════════════════════════════════════════════

func TestIsNewer(t *testing.T) {
	tests := []struct {
		name    string
		current string
		latest  string
		want    bool
	}{
		{"same version", "v1.2.3", "v1.2.3", false},
		{"patch update", "v1.2.3", "v1.2.4", true},
		{"minor update", "v1.2.3", "v1.3.0", true},
		{"major update", "v1.2.3", "v2.0.0", true},
		{"current is newer", "v2.0.0", "v1.0.0", false},
		{"pre-release ignored", "v1.2.3", "v1.2.3-rc.1", false},
		{"missing v prefix", "1.2.3", "v1.2.4", true},
		{"zero versions", "v0.0.0", "v0.0.1", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsNewer(tt.current, tt.latest)
			if got != tt.want {
				t.Errorf("IsNewer(%q, %q) = %v, want %v", tt.current, tt.latest, got, tt.want)
			}
		})
	}
}

// ══════════════════════════════════════════════════════════════════════════════
// Version.String tests
// ══════════════════════════════════════════════════════════════════════════════

func TestVersionString(t *testing.T) {
	v := Version{Major: 1, Minor: 2, Patch: 3, Raw: "v1.2.3"}
	if got := v.String(); got != "1.2.3" {
		t.Errorf("Version.String() = %q, want %q", got, "1.2.3")
	}
}
