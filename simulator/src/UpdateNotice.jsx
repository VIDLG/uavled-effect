import React from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { REPOSITORY, shortCommit } from "./repositoryUpdate.js";
import "./UpdateNotice.css";

export default function UpdateNotice({ update, onCheck, onDismiss }) {
  if (update.status !== "update-available") return null;
  return <aside className="update-notice" role="status">
    <div className="update-notice-mark"><RefreshCw size={16} /></div>
    <div className="update-notice-copy">
      <strong>仓库有新内容</strong>
      <span>远端已更新到 {shortCommit(update.remoteCommit)} · {update.message}</span>
    </div>
    <div className="update-notice-actions">
      <a href={update.compareUrl || REPOSITORY.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />查看更新</a>
      <button type="button" onClick={onCheck} title="重新检查" aria-label="重新检查"><RefreshCw size={14} /></button>
      <button type="button" onClick={onDismiss} title="关闭通知" aria-label="关闭通知"><X size={16} /></button>
    </div>
  </aside>;
}
