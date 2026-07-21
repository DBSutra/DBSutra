class Dbsutra < Formula
  desc "A modern, cross-platform database client"
  homepage "https://github.com/DBSutra/DBSutra"
  version "1.0.0"
  license "Proprietary"

  on_macos do
    on_arm do
      url "https://github.com/DBSutra/DBSutra/releases/download/v#{version}/DBSutra-macOS-arm64.dmg"
      sha256 "PLACEHOLDER_ARM64_SHA256"
    end
    on_intel do
      url "https://github.com/DBSutra/DBSutra/releases/download/v#{version}/DBSutra-macOS-amd64.dmg"
      sha256 "PLACEHOLDER_AMD64_SHA256"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/DBSutra/DBSutra/releases/download/v#{version}/DBSutra-Linux-arm64"
      sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
    end
    on_intel do
      url "https://github.com/DBSutra/DBSutra/releases/download/v#{version}/DBSutra-Linux-amd64"
      sha256 "PLACEHOLDER_LINUX_AMD64_SHA256"
    end
  end

  def install
    if OS.mac?
      prefix.install "DBSutra.app"
      bin.install_symlink prefix/"DBSutra.app/Contents/MacOS/DBSutra"
    else
      bin.install "DBSutra"
    end
  end

  test do
    system "#{bin}/DBSutra", "--version"
  end
end
