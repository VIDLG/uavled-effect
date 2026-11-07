const BUILD_COMMIT = typeof __UAVLED_BUILD_COMMIT__ === "string" ? __UAVLED_BUILD_COMMIT__ : "unknown";

export const REPOSITORY = Object.freeze({
  owner: "VIDLG",
  name: "uavled-effect",
  branch: "main",
  url: "https://github.com/VIDLG/uavled-effect",
});

export const localBuildCommit = BUILD_COMMIT;

export function shortCommit(commit) {
  return commit && commit !== "unknown" ? commit.slice(0, 7) : "未知";
}

export function compareUrl(localCommit, remoteCommit) {
  if (!localCommit || !remoteCommit || localCommit === "unknown") return REPOSITORY.url;
  return `${REPOSITORY.url}/compare/${localCommit}...${remoteCommit}`;
}

export async function checkRepositoryUpdate({ fetchImpl = fetch, signal, localCommit = BUILD_COMMIT } = {}) {
  if (!localCommit || localCommit === "unknown") {
    return { status: "unavailable", reason: "local-commit-missing" };
  }

  const endpoint = `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.name}/commits/${REPOSITORY.branch}`;
  const response = await fetchImpl(endpoint, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub update check failed: ${response.status}`);
  const commit = await response.json();
  const remoteCommit = commit.sha;
  if (!remoteCommit) throw new Error("GitHub update response did not include a commit SHA");

  return {
    status: remoteCommit === localCommit ? "current" : "update-available",
    localCommit,
    remoteCommit,
    message: commit.commit?.message?.split("\n", 1)[0] || "仓库有新的提交",
    author: commit.commit?.author?.name || "",
    committedAt: commit.commit?.author?.date || "",
    htmlUrl: commit.html_url || `${REPOSITORY.url}/commit/${remoteCommit}`,
    compareUrl: compareUrl(localCommit, remoteCommit),
  };
}
