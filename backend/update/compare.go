// Copyright (C) 2024-2026 DBSutra. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
// See LICENSE file in the project root for full license information.

package update

import (
	"fmt"
	"strconv"
	"strings"
)

// ══════════════════════════════════════════════════════════════════════════════
// SEMANTIC VERSION COMPARISON
// ══════════════════════════════════════════════════════════════════════════════

// Version represents a parsed semantic version (major.minor.patch).
type Version struct {
	Major int
	Minor int
	Patch int
	Raw   string // original string, e.g. "v1.2.3"
}

// ParseVersion parses a version string like "v1.2.3" or "1.2.3" into a Version.
// Only numeric components are considered; pre-release labels and build metadata
// are stripped and ignored.
func ParseVersion(s string) (Version, error) {
	raw := s
	s = strings.TrimSpace(s)
	if s == "" {
		return Version{}, fmt.Errorf("empty version string")
	}

	// Strip leading "v" or "V"
	s = strings.TrimPrefix(s, "v")
	s = strings.TrimPrefix(s, "V")

	// Strip pre-release suffix (e.g. "-beta.1") and build metadata (e.g. "+build.123")
	if idx := strings.IndexAny(s, "-+"); idx != -1 {
		s = s[:idx]
	}

	parts := strings.Split(s, ".")
	if len(parts) == 0 || len(parts) > 3 {
		return Version{}, fmt.Errorf("invalid version format: %q", raw)
	}

	// Pad to 3 components
	for len(parts) < 3 {
		parts = append(parts, "0")
	}

	var nums [3]int
	for i, p := range parts {
		n, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil {
			return Version{}, fmt.Errorf("invalid version component %q in %q: %w", p, raw, err)
		}
		if n < 0 {
			return Version{}, fmt.Errorf("negative version component %d in %q", n, raw)
		}
		nums[i] = n
	}

	return Version{Major: nums[0], Minor: nums[1], Patch: nums[2], Raw: raw}, nil
}

// CompareVersions compares two version strings semantically.
// Returns -1 if a < b, 0 if a == b, +1 if a > b.
// Both "v1.2.3" and "1.2.3" formats are accepted.
func CompareVersions(a, b string) int {
	va, errA := ParseVersion(a)
	vb, errB := ParseVersion(b)

	// If either fails to parse, fall back to string comparison
	if errA != nil || errB != nil {
		if a < b {
			return -1
		}
		if a > b {
			return 1
		}
		return 0
	}

	if va.Major != vb.Major {
		if va.Major < vb.Major {
			return -1
		}
		return 1
	}
	if va.Minor != vb.Minor {
		if va.Minor < vb.Minor {
			return -1
		}
		return 1
	}
	if va.Patch != vb.Patch {
		if va.Patch < vb.Patch {
			return -1
		}
		return 1
	}
	return 0
}

// IsNewer returns true if latest is strictly newer than current.
func IsNewer(current, latest string) bool {
	return CompareVersions(current, latest) < 0
}

// String returns a human-readable representation of the version.
func (v Version) String() string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}
