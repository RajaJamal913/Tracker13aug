"use client";

import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { Send, Paperclip, Search, Users, MoreVertical } from "lucide-react";
import { format } from "date-fns";

const NOTIFICATION_ICON = "/mnt/data/76e1430c-c9a9-4a60-badf-4b37bc282446.png";

type Member = { id: number | string; username?: string; name?: string };

type BackendMessage = {
  id: number | string;
  sender_id?: number | string;
  sender_username?: string;
  sender_member_id?: number | string | null;
  recipient_member?: { id: number | string; username?: string; name?: string } | null;
  content?: string | null;
  message_type?: "text" | "image" | "file";
  file?: string | null;
  file_url?: string | null;
  created_at?: string;
  channel?: string;
  is_sender?: boolean;
  other_member_id?: number | string | null;
};

type ConversationType = "dm" | "channel";

/**
 * PdfViewer: fetches the PDF bytes as a blob (credentials included),
 * creates an object URL and renders it inside an iframe.
 *
 * Props:
 * - url: remote PDF url
 * - filename: display name
 * - height: iframe height (number px or CSS string)
 * - allowCredentials: if true fetches with credentials: "include"
 * - tryFetch: if true tries the fetch-as-blob approach first; if it fails, the component will show a fallback link
 */
function PdfViewer({
  url,
  filename,
  height = 400,
  allowCredentials = true,
  tryFetch = true,
}: {
  url: string;
  filename?: string;
  height?: number | string;
  allowCredentials?: boolean;
  tryFetch?: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentObjRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // cleanup previous object URL
    if (currentObjRef.current) {
      URL.revokeObjectURL(currentObjRef.current);
      currentObjRef.current = null;
    }
    setBlobUrl(null);
    setError(null);

    if (!url) return;

    // If tryFetch is false, skip and show fallback links
    if (!tryFetch) {
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    (async () => {
      try {
        // build headers if token present in localStorage
        const headers: Record<string, string> = {};
        try {
          const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (t) headers["Authorization"] = `Token ${t}`;
        } catch {}

        const fetchOptions: RequestInit = {
          method: "GET",
          signal: ac.signal,
          credentials: allowCredentials ? "include" : "omit",
          headers,
        };

        const res = await fetch(url, fetchOptions);
        if (!res.ok) {
          // If server returns html (like login page) or forbids fetch, throw with status
          throw new Error(`HTTP ${res.status}`);
        }

        const contentType = res.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().includes("application/pdf")) {
          // Could be an HTML error/login page — show fallback
          throw new Error(`Invalid content-type: ${contentType}`);
        }

        const blob = await res.blob();
        const obj = URL.createObjectURL(blob);
        currentObjRef.current = obj;
        setBlobUrl(obj);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // aborted — ignore
        } else {
          console.warn("PdfViewer fetch-as-blob failed:", err);
          setError(String(err?.message || err));
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      // cleanup for this run
      abortRef.current?.abort();
      if (currentObjRef.current) {
        URL.revokeObjectURL(currentObjRef.current);
        currentObjRef.current = null;
      }
      setBlobUrl(null);
      setLoading(false);
      setError(null);
    };
  }, [url, allowCredentials, tryFetch]);

  // If we successfully loaded a blob URL, use that in an iframe
  if (blobUrl) {
    return (
      <div className="space-y-2">
        <iframe src={blobUrl} title={filename || "pdf"} style={{ width: "100%", height, border: "none" }} />
        <div className="mt-2 flex gap-3">
        
        </div>
      </div>
    );
  }

  // While loading show a spinner/message
  if (loading) {
    return <div className="text-sm text-gray-500">Loading PDF…</div>;
  }

  // If fetch failed or was not attempted, provide a safe fallback: open in new tab
  return (
    <div className="space-y-2">
      <div className="border rounded p-4 bg-gray-50 text-center">
        <div className="mb-2 text-sm text-gray-700">PDF cannot be embedded — {error ? `(${error})` : "fallback available"}</div>
        <div className="flex justify-center gap-3">
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            Open PDF in new tab
          </a>
          <a href={url} download className="ml-2 px-2 py-1 bg-gray-200 rounded">
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ChatPage component (your original code with the PDF handling replaced to use PdfViewer)
// -----------------------------------------------------------------------------
export default function ChatPage(): JSX.Element {
  // ---------- state ----------
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [channels, setChannels] = useState<any[]>([]);
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});

  const [activeConversationType, setActiveConversationType] = useState<ConversationType>("dm");
  const [activeRecipientId, setActiveRecipientId] = useState<number | string | null>(null);
  const [activeRecipientName, setActiveRecipientName] = useState<string | undefined>(undefined);
  const activeRecipientRef = useRef<number | string | null>(null);
  useEffect(() => {
    activeRecipientRef.current = activeRecipientId;
  }, [activeRecipientId]);

  const [activeChannelId, setActiveChannelId] = useState<number | string | null>(null);
  const activeChannelRef = useRef<number | string | null>(null);
  useEffect(() => {
    activeChannelRef.current = activeChannelId;
  }, [activeChannelId]);

  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [memberUnread, setMemberUnread] = useState<Record<string, number>>({});
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);

  // ---------- API config ----------
  const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const MEMBERS_API = `${API_ROOT}/api/members/`;
  const INVITERS_API = `${API_ROOT}/api/members/who-invited-me/`;
  const DIRECT_MESSAGES_API = `${API_ROOT}/api/chat/direct-messages/`;
  const CONVERSATIONS_API = `${API_ROOT}/api/chat/channels/`;
  const MESSAGES_API = `${API_ROOT}/api/chat/messages/`;
  const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || API_ROOT.replace(/^http/, "ws") + "/ws/dm";

  // ---------- auth helpers ----------
  const getLocalToken = (): string | null => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  const buildAuthHeaders = useCallback((): Record<string, string> => {
    const t = getLocalToken();
    return t ? { Authorization: `Token ${t}` } : {};
  }, []);

  const TOKEN_FETCH_API = `${API_ROOT}/api/auth/token/`;
  const fetchTokenFromServer = async (): Promise<string | null> => {
    try {
      const res = await fetch(TOKEN_FETCH_API, { method: "GET", credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        return data.token;
      }
      return null;
    } catch {
      return null;
    }
  };
  const ensureToken = useCallback(async () => {
    let t = getLocalToken();
    if (t) return t;
    t = await fetchTokenFromServer();
    return t;
  }, []);

  // ---------- scroll ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- normalize incoming message ----------
  const normalizeMessage = useCallback((raw: any): BackendMessage => {
    const m: BackendMessage = { ...(raw || {}) };
    if (typeof m.is_sender === "undefined") {
      m.is_sender = Boolean(m.sender_username && String(m.sender_username).toLowerCase() === "you") || String(m.sender_id) === "me";
    }
    if (typeof m.other_member_id === "undefined") {
      if (m.recipient_member && (m.recipient_member as any).id) {
        m.other_member_id = String((m.recipient_member as any).id);
      } else if (m.channel && typeof m.channel === "string" && m.channel.startsWith("dm-")) {
        m.other_member_id = m.channel.split("dm-")[1];
      } else {
        m.other_member_id = null;
      }
    }
    return m;
  }, []);

  // ---------- sort helper ----------
  const sortMembersByUnreadThenName = useCallback((list: Member[] = []) => {
    const copy = Array.isArray(list) ? [...list] : [];
    copy.sort((a, b) => {
      const aId = String(a.id);
      const bId = String(b.id);
      const ua = memberUnread[aId] || 0;
      const ub = memberUnread[bId] || 0;

      if (ua !== ub) return ub - ua;

      const active = activeRecipientRef.current ? String(activeRecipientRef.current) : null;
      if (active) {
        if (String(a.id) === active) return -1;
        if (String(b.id) === active) return 1;
      }

      const an = (a.name || a.username || "").toLowerCase();
      const bn = (b.name || b.username || "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return copy;
  }, [memberUnread]);

  // ---------- Direct messages (DM) ----------
  const fetchDirectMessages = useCallback(
    async (memberId: number | string | null) => {
      if (!memberId) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      try {
        const token = await ensureToken();
        if (!token) {
          setMessages([]);
          setLoadingMessages(false);
          return;
        }

        const rawMemberId = String(memberId).startsWith("u-") ? String(memberId).split("u-")[1] : memberId;
        const url = `${DIRECT_MESSAGES_API}?member=${encodeURIComponent(String(rawMemberId))}`;
        const res = await fetch(url, { method: "GET", credentials: "include", headers: { ...buildAuthHeaders() } });
        const raw = await res.text();
        if (!res.ok) {
          console.error("fetchDirectMessages failed", res.status, res.statusText, "body:", raw);
          setMessages([]);
          setLoadingMessages(false);
          return;
        }
        const data = JSON.parse(raw);
        const msgs = Array.isArray(data) ? data : (data.results || []);
        const normalized = msgs.map((m: any) => normalizeMessage(m));
        setMessages(normalized);

        setMemberUnread((prev) => ({ ...prev, [String(memberId)]: 0 }));
        setMembers((prev) => sortMembersByUnreadThenName(prev));
      } catch (err) {
        console.error("fetchDirectMessages error", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [DIRECT_MESSAGES_API, ensureToken, normalizeMessage, sortMembersByUnreadThenName, buildAuthHeaders]
  );

  const sendDirectMessage = useCallback(
    async (recipientId: number | string, text: string, file?: File) => {
      if ((!text || text.trim() === "") && !file) return;
      const token = await ensureToken();
      if (!token) {
        console.error("No token for sendDirectMessage");
        return;
      }

      const rawRecipientId = String(recipientId).startsWith("u-") ? String(recipientId).split("u-")[1] : recipientId;

      const optimistic: BackendMessage = {
        id: `temp-${Date.now()}`,
        channel: `dm-${recipientId}`,
        sender_id: "me",
        sender_username: "You",
        content: text || (file ? `Shared a file: ${file.name}` : ""),
        message_type: file ? (file.type.startsWith("image/") ? "image" : "file") : "text",
        file: file ? file.name : null,
        file_url: file ? URL.createObjectURL(file) : undefined,
        created_at: new Date().toISOString(),
        is_sender: true,
        other_member_id: String(recipientId),
      };
      setMessages((prev) => [...prev, optimistic]);

      const fd = new FormData();
      fd.append("recipient_id", String(rawRecipientId));
      if (text) fd.append("content", text);
      fd.append("message_type", file ? (file.type.startsWith("image/") ? "image" : "file") : "text");
      if (file) fd.append("file", file);

      setUploading(true);
      try {
        const res = await fetch(DIRECT_MESSAGES_API, {
          method: "POST",
          credentials: "include",
          headers: token ? { Authorization: `Token ${token}` } : undefined,
          body: fd,
        });
        const body = await res.text();
        if (!res.ok) {
          console.error("sendDirectMessage failed", res.status, res.statusText, "body:", body);
          setMessages((prev) => prev.filter((m) => String(m.id).startsWith("temp-") === false));
          return;
        }
        await fetchDirectMessages(recipientId);
      } catch (err) {
        console.error("sendDirectMessage error", err);
        setMessages((prev) => prev.filter((m) => String(m.id).startsWith("temp-") === false));
      } finally {
        setUploading(false);
      }
    },
    [DIRECT_MESSAGES_API, ensureToken, fetchDirectMessages]
  );

  // ---------- Members (DM) ----------
  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const token = await ensureToken();
      if (!token) {
        console.error("No token: set localStorage.setItem('token', '<token>')");
        setMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      const headers: HeadersInit = { "Content-Type": "application/json", ...(buildAuthHeaders() as Record<string, string>) };

      const res = await fetch(`${MEMBERS_API}?invited_by_me=1`, { method: "GET", credentials: "include", headers });
      const text = await res.text();
      if (!res.ok) {
        console.error("fetchMembers failed", res.status, res.statusText, "body:", text);
        setMembers([]);
        setIsLoadingMembers(false);
        return;
      }
      const membersData = JSON.parse(text);
      const listFromMembers: any[] = Array.isArray(membersData) ? membersData : (membersData.results || membersData || []);

      let inviters: { members: any[]; users_without_member: any[] } = { members: [], users_without_member: [] };
      try {
        const r2 = await fetch(INVITERS_API, { method: "GET", credentials: "include", headers });
        if (r2.ok) {
          inviters = await r2.json();
        } else {
          console.warn("fetchInviters failed", r2.status, await r2.text());
        }
      } catch (err) {
        console.warn("fetchInviters error", err);
      }

      const seen = new Set<string>();
      const normalized: Member[] = [];

      const extractStableId = (m: any) => {
        if (!m) return null;
        if (m.user !== undefined && m.user !== null) return String(m.user);
        if (m.id !== undefined && m.id !== null) return String(m.id);
        return null;
      };

      const invMembers = Array.isArray(inviters.members) ? inviters.members : [];
      for (const im of invMembers) {
        const stable = extractStableId(im) || `member-${im.id}`;
        if (seen.has(stable)) continue;
        seen.add(stable);
        normalized.push({
          id: im.user !== undefined && im.user !== null ? String(im.user) : im.id ?? stable,
          username: im.username ?? (im.user && im.user.username) ?? im.user_email ?? im.email ?? String(im.user ?? im.id),
          name: im.username ?? im.display_name ?? (im.user && im.user.first_name) ?? "",
        });
      }

      const invUsers = Array.isArray(inviters.users_without_member) ? inviters.users_without_member : [];
      for (const u of invUsers) {
        const uid = u && u.id ? String(u.id) : null;
        if (!uid) continue;
        const stable = `u-${uid}`;
        if (seen.has(stable)) continue;
        seen.add(stable);
        normalized.push({
          id: stable,
          username: u.username || u.email || `user-${uid}`,
          name: u.username || u.first_name || u.email || "",
        });
      }

      for (const m of listFromMembers) {
        const stable = extractStableId(m) || `member-${m.id}`;
        if (seen.has(stable)) continue;
        seen.add(stable);
        const idVal = m.user !== undefined && m.user !== null ? String(m.user) : m.id ?? stable;
        normalized.push({
          id: idVal,
          username: m.username ?? (m.user && m.user.username) ?? m.email ?? String(m.id),
          name: m.username ?? (m.user && m.user.first_name) ?? "",
        });
      }

      const sorted = sortMembersByUnreadThenName(normalized);
      setMembers(sorted);

      if (!activeRecipientRef.current && sorted.length) {
        const first = sorted[0];
        setActiveRecipientId(first.id);
        setActiveRecipientName(first.name || first.username);
        setTimeout(() => fetchDirectMessages(first.id), 0);
      }
    } catch (err) {
      console.error("fetchMembers error", err);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [MEMBERS_API, INVITERS_API, ensureToken, sortMembersByUnreadThenName, fetchDirectMessages, buildAuthHeaders]);

  // ---------- Channels ----------
  const fetchChannels = useCallback(async () => {
    try {
      const token = await ensureToken();
      if (!token) {
        setChannels([]);
        return;
      }
      const res = await fetch(CONVERSATIONS_API, { method: "GET", credentials: "include", headers: { ...buildAuthHeaders() } });
      const text = await res.text();
      if (!res.ok) {
        console.error("fetchChannels failed", res.status, text);
        setChannels([]);
        return;
      }
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : (data.results || []);
      setChannels(list);
    } catch (err) {
      console.error("fetchChannels err", err);
      setChannels([]);
    }
  }, [CONVERSATIONS_API, ensureToken, buildAuthHeaders]);

  const fetchChannelMessages = useCallback(
    async (channelId: number | string | null) => {
      if (!channelId) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      try {
        const token = await ensureToken();
        if (!token) {
          setMessages([]);
          setLoadingMessages(false);
          return;
        }
        const url = `${CONVERSATIONS_API}${channelId}/messages/`;
        const res = await fetch(url, { method: "GET", credentials: "include", headers: { ...buildAuthHeaders() } });
        const text = await res.text();
        if (!res.ok) {
          console.error("fetchChannelMessages failed", res.status, text);
          setMessages([]);
          setLoadingMessages(false);
          return;
        }
        const data = JSON.parse(text);
        const msgs = Array.isArray(data) ? data : (data.results || []);
        const normalized = msgs.map((m: any) => normalizeMessage(m));
        setMessages(normalized);
        setChannelUnread((prev) => ({ ...prev, [String(channelId)]: 0 }));
      } catch (err) {
        console.error("fetchChannelMessages err", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [CONVERSATIONS_API, ensureToken, normalizeMessage, buildAuthHeaders]
  );

  const sendChannelMessage = useCallback(
    async (channelId: number | string, text: string, file?: File) => {
      if ((!text || text.trim() === "") && !file) return;
      const token = await ensureToken();
      if (!token) {
        console.error("No token for sendChannelMessage");
        return;
      }

      const optimistic: BackendMessage = {
        id: `temp-ch-${Date.now()}`,
        channel: `channel-${channelId}`,
        sender_id: "me",
        sender_username: "You",
        content: text || (file ? `Shared a file: ${file.name}` : ""),
        message_type: file ? (file.type.startsWith("image/") ? "image" : "file") : "text",
        file: file ? file.name : null,
        file_url: file ? URL.createObjectURL(file) : undefined,
        created_at: new Date().toISOString(),
        is_sender: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const fd = new FormData();
      fd.append("channel", String(channelId));
      if (text) fd.append("content", text);
      fd.append("message_type", file ? (file.type.startsWith("image/") ? "image" : "file") : "text");
      if (file) fd.append("file", file);

      setUploading(true);
      try {
        const res = await fetch(MESSAGES_API, {
          method: "POST",
          credentials: "include",
          headers: token ? { Authorization: `Token ${token}` } : undefined,
          body: fd,
        });
        const body = await res.text();
        if (!res.ok) {
          console.error("sendChannelMessage failed", res.status, res.statusText, "body:", body);
          setMessages((prev) => prev.filter((m) => String(m.id).startsWith("temp-ch-") === false));
          return;
        }
        await fetchChannelMessages(channelId);
      } catch (err) {
        console.error("sendChannelMessage error", err);
        setMessages((prev) => prev.filter((m) => String(m.id).startsWith("temp-ch-") === false));
      } finally {
        setUploading(false);
      }
    },
    [MESSAGES_API, ensureToken, fetchChannelMessages]
  );

  const toggleParticipantSelection = useCallback((id: number | string) => {
    setSelectedParticipantIds((prev) => {
      const sid = String(id);
      const exists = prev.map(String).includes(sid);
      if (exists) return prev.filter((x) => String(x) !== sid);
      return [...prev, Number(id)];
    });
  }, []);

  const createChannel = useCallback(async () => {
    const token = await ensureToken();
    if (token == null) {
      console.warn("No token for createChannel");
      return;
    }

    if (!newChannelName.trim()) {
      alert("Channel name required");
      return;
    }
    if (selectedParticipantIds.length === 0) {
      alert("Select at least one participant");
      return;
    }

    const payload = {
      name: newChannelName.trim(),
      participant_ids: selectedParticipantIds,
    };

    try {
      const res = await fetch(CONVERSATIONS_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(buildAuthHeaders() as Record<string, string>) },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("createChannel failed", res.status, text);
        try {
          const err = JSON.parse(text);
          alert(err.detail || JSON.stringify(err));
        } catch {
          alert("Failed to create channel");
        }
        return;
      }
      const newChannel = JSON.parse(text);

      setChannels((prev) => [newChannel, ...prev]);
      setShowCreateChannel(false);
      setNewChannelName("");
      setSelectedParticipantIds([]);
      setActiveConversationType("channel");
      setActiveChannelId(newChannel.id);
      fetchChannelMessages(newChannel.id);

      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
          wsRef.current.send(JSON.stringify({ subscribe_channel: Number(newChannel.id) }));
      } catch {}
    } catch (err) {
      console.error("createChannel error", err);
      alert("Error creating channel");
    }
  }, [CONVERSATIONS_API, ensureToken, newChannelName, selectedParticipantIds, fetchChannelMessages, buildAuthHeaders]);

  // ---------- File helpers ----------
  const onPickFile = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (activeConversationType === "dm" && activeRecipientId) sendDirectMessage(activeRecipientId, "", f);
      else if (activeConversationType === "channel" && activeChannelId) sendChannelMessage(activeChannelId, "", f);
    }
    e.currentTarget.value = "";
  };

  // ---------- WebSocket (realtime) ----------
  const buildWsUrl = useCallback(() => {
    if (!WS_BASE) return "";
    const base = WS_BASE.replace(/\/$/, "");
    const params = new URLSearchParams();
    const t = getLocalToken();
    if (t) params.set("token", t);
    return `${base}?${params.toString()}`;
  }, [WS_BASE]);

  const handleIncomingMessage = useCallback(
    (payload: any) => {
      if (!payload) return;
      const norm = normalizeMessage(payload);

      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(norm.id))) return prev;
        return [...prev, norm];
      });

      if (norm.channel && typeof norm.channel === "string" && norm.channel.startsWith("channel-")) {
        const chId = norm.channel.split("channel-")[1];
        const activeCh = activeChannelRef.current;
        if (activeCh && String(activeCh) === String(chId)) {
          fetchChannelMessages(activeCh);
          return;
        }
        setChannelUnread((prev) => ({ ...prev, [chId]: (prev[chId] || 0) + 1 }));
        return;
      }

      const otherMemberId: string | null = norm.other_member_id ? String(norm.other_member_id) : null;
      const active = activeRecipientRef.current;
      if (active && otherMemberId && String(active) === String(otherMemberId)) {
        fetchDirectMessages(active);
        return;
      }
      if (otherMemberId) {
        setMemberUnread((prev) => {
          const key = String(otherMemberId);
          const next = { ...prev, [key]: (prev[key] || 0) + 1 };
          return next;
        });

        setMembers((prev) => {
          const updated = prev.map((m) => ({ ...m }));
          return sortMembersByUnreadThenName(updated);
        });

        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(norm.sender_username || "New message", { body: norm.content || "", icon: NOTIFICATION_ICON });
          } else if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
            Notification.requestPermission().then((perm) => {
              if (perm === "granted") new Notification(norm.sender_username || "New message", { body: norm.content || "", icon: NOTIFICATION_ICON });
            });
          }
        } catch {}
      }
    },
    [fetchChannelMessages, fetchDirectMessages, normalizeMessage, sortMembersByUnreadThenName]
  );

  useEffect(() => {
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
    setWsConnected(false);

    if (!WS_BASE) {
      if (activeConversationType === "dm" && activeRecipientRef.current) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => fetchDirectMessages(activeRecipientRef.current), 5000);
      } else if (activeConversationType === "channel" && activeChannelRef.current) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => fetchChannelMessages(activeChannelRef.current), 5000);
      }
      return;
    }

    const wsUrl = buildWsUrl();
    if (!wsUrl) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn("WebSocket construct failed", e);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.info("WS connected", wsUrl);
      try {
        const ac = activeChannelRef.current;
        if (ac) ws.send(JSON.stringify({ subscribe_channel: Number(ac) }));
      } catch {}
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const payload = data.message || data;
        handleIncomingMessage(payload);
      } catch (e) {
        console.error("ws parse error", e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        try {
          const url2 = buildWsUrl();
          if (url2) {
            const ws2 = new WebSocket(url2);
            wsRef.current = ws2;
          }
        } catch {}
      }, 2000);
    };
    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setWsConnected(false);
    };

    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WS_BASE, buildWsUrl, handleIncomingMessage, activeConversationType]);

  // ---------- mount ----------
  useEffect(() => {
    notificationSoundRef.current = new Audio();
    fetchMembers();
    fetchChannels();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ---------- helpers / dev ----------
  const fetchConversations = async () => {
    const t = getLocalToken();
    if (!t) {
      console.warn("No token for fetchConversations");
      return;
    }
    const res = await fetch(CONVERSATIONS_API, { method: "GET", credentials: "include", headers: { ...buildAuthHeaders() } });
    const text = await res.text();
    console.debug("Conversations raw:", text);
  };

  const injectTestIncoming = () => {
    if (!activeRecipientId && !activeChannelId) return;
    const target = activeConversationType === "dm" ? activeRecipientId : activeChannelId;
    const msg: BackendMessage = {
      id: `sim-${Date.now()}`,
      channel: activeConversationType === "dm" ? `dm-${target}` : `channel-${target}`,
      sender_id: 999,
      sender_username: "Sim Sender",
      content: "Simulated incoming message",
      message_type: "text",
      created_at: new Date().toISOString(),
      sender_member_id: 999,
      is_sender: false,
      other_member_id: String(target),
    };
    handleIncomingMessage(msg);
  };

  const filteredMembers = sortMembersByUnreadThenName(
    members.filter((m) => (m.name || m.username || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const formatTime = (s?: string) => (s ? format(new Date(s), "HH:mm") : "");
  const isPdfUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const u = url.split("?")[0].toLowerCase();
      return u.endsWith(".pdf");
    } catch {
      return false;
    }
  };

  const openChatWith = (id: number | string, name?: string) => {
    setActiveConversationType("dm");
    setActiveRecipientId(id);
    setActiveRecipientName(name);
    setActiveChannelId(null);
    fetchDirectMessages(id);
    setMemberUnread((prev) => ({ ...prev, [String(id)]: 0 }));
    setMembers((prev) => sortMembersByUnreadThenName(prev));
  };

  // ---------- UI ----------
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-gradient-to-b from-purple-700 via-purple-600 to-indigo-600 text-white flex flex-col">
        <div className="p-4 border-b border-purple-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="flex items-center space-x-2">
              <button onClick={() => { fetchMembers(); fetchConversations(); fetchChannels(); }} className="p-1 rounded hover:bg-white/10">
                ⟳
              </button>
              <button onClick={() => injectTestIncoming()} className="p-1 rounded hover:bg-white/10">
                🖼
              </button>
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={16} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded bg-white bg-opacity-10 placeholder-white/60 outline-none" placeholder="Search members..." />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-3 border-b border-purple-500 flex items-center justify-between">
            <span className="font-semibold">Channels</span>
            <div className="flex items-center gap-2">
              <button onClick={() => { fetchChannels(); }} className="text-white/80">
                ⟳
              </button>
              <button onClick={() => setShowCreateChannel(true)} className="ml-2 px-2 py-1 rounded bg-white/10 text-sm">
                + New
              </button>
            </div>
          </div>

          <div className="p-3 space-y-1 max-h-[30vh] overflow-auto">
            {channels.length === 0 ? (
              <div className="text-white/70">No channels</div>
            ) : (
              channels.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                  <div>
                    <div className="font-medium">{c.name || `Channel #${c.id}`}</div>
                    <div className="text-xs opacity-80">{(c.participants || []).map((p: any) => p.username || p.id).join(", ")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channelUnread[String(c.id)] ? <span className="bg-red-500 text-white text-xs rounded-full px-2">{channelUnread[String(c.id)]}</span> : null}
                    <button
                      onClick={() => {
                        setActiveConversationType("channel");
                        setActiveChannelId(c.id);
                        setActiveRecipientId(null);
                        setActiveRecipientName(undefined);
                        fetchChannelMessages(c.id);
                        setChannelUnread((prev) => ({ ...prev, [String(c.id)]: 0 }));
                        try {
                          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ subscribe_channel: Number(c.id) }));
                        } catch {}
                      }}
                      className="px-2 py-1 text-sm rounded bg-white/10"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-b border-purple-500 flex items-center justify-between">
            <span className="font-semibold">Direct Message</span>
            <button className="ml-2 text-white/80" onClick={() => { fetchMembers(); fetchConversations(); }}>
              Refresh
            </button>
          </div>

          <div className="p-3 space-y-1 max-h-[60vh] overflow-auto">
            {isLoadingMembers ? (
              <div className="text-white/80">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-white/70">No members found</div>
            ) : (
              filteredMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                  <div>
                    <div className="font-medium">{m.name || m.username}</div>
                    <div className="text-xs opacity-80">{m.username}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {memberUnread[String(m.id)] ? <span className="bg-red-500 text-white text-xs rounded-full px-2">{memberUnread[String(m.id)]}</span> : null}
                    <button onClick={() => openChatWith(m.id, m.name || m.username)} className="px-2 py-1 text-sm rounded bg-white/10">
                      Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        <div className="border-b bg-white p-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{activeConversationType === "dm" ? (activeRecipientName || (activeRecipientId ? "Direct message" : "Select a conversation")) : activeChannelId ? `Channel ${activeChannelId}` : "Select a conversation"}</h3>
            <p className="text-sm text-gray-500">{activeConversationType === "dm" ? (activeRecipientId ? `DM with ${activeRecipientName || activeRecipientId}` : "") : activeChannelId ? `Channel ${activeChannelId}` : ""}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`text-sm ${wsConnected ? "text-green-600" : "text-yellow-600"}`}>{wsConnected ? "Realtime" : "Realtime off"}</div>
            <button className="p-2 rounded hover:bg-gray-100">
              <Users size={18} />
            </button>
            <button className="p-2 rounded hover:bg-gray-100">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 bg-white/50">
          {!activeRecipientId && !activeChannelId && <div className="text-center text-gray-500 mt-20">Choose a member or channel to start chatting</div>}

          {loadingMessages && <div className="text-center text-gray-500 mt-6">Loading messages...</div>}

          {!loadingMessages && messages.length === 0 && (activeRecipientId || activeChannelId) && <div className="text-center text-gray-500 mt-20">No messages in this conversation</div>}

          {messages.map((m) => {
            const isOwn = Boolean(m.is_sender);
            const sender = m.sender_username || m.sender_id;
            return (
              <div key={String(m.id)} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-md p-3 rounded-lg ${isOwn ? "bg-purple-100 text-black" : "bg-gray-800 text-white"}`}>
                  <div className="text-xs mb-1 opacity-80">{sender}</div>

                  {m.message_type === "image" && m.file_url && <img src={m.file_url} alt={m.file || "image"} className="mb-2 rounded max-w-full" />}

                  {m.message_type === "file" && (
                    <div className="mb-2">
                      {isPdfUrl(m.file_url) ? (
                        // <-- REPLACED: use PdfViewer (blob-fetch approach) to render PDFs robustly
                        <div className="space-y-2">
                          <div className="border rounded overflow-hidden">
                            <PdfViewer url={m.file_url || ""} filename={m.file || "file.pdf"} height={400} allowCredentials={true} tryFetch={true} />
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <a href={m.file_url || "#"} target="_blank" rel="noreferrer" className="underline">
                              Open PDF in new tab
                            </a>
                            <a href={m.file_url || "#"} download className="ml-2 px-2 py-1 bg-gray-200 rounded">
                              Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 bg-white/10 p-2 rounded">
                          <Paperclip size={16} />
                          <a href={m.file_url || "#"} target="_blank" rel="noreferrer" className="underline truncate max-w-xs">
                            {m.file || "attachment"}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div>{m.content}</div>
                  <div className="text-xs opacity-70 mt-1 text-right">{m.created_at ? format(new Date(m.created_at), "HH:mm") : ""}</div>
                </div>
              </div>
            );
          })}

          {isTyping && <div className="text-sm text-gray-500">Someone is typing...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (activeConversationType === "dm") {
                if (activeRecipientId) {
                  sendDirectMessage(activeRecipientId, newMessage);
                  setNewMessage("");
                }
              } else {
                if (activeChannelId) {
                  sendChannelMessage(activeChannelId, newMessage);
                  setNewMessage("");
                }
              }
            }}
            className="flex items-center gap-3"
          >
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,*/*" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => onPickFile()} className="px-3 py-2 rounded bg-white border">
              📎
            </button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={activeConversationType === "dm" ? (activeRecipientId ? `Message ${activeRecipientName || ""}...` : "Select a conversation") : activeChannelId ? `Message channel #${activeChannelId}...` : "Select a conversation"}
              className="flex-1 px-4 py-2 border rounded"
              disabled={!(activeConversationType === "dm" ? activeRecipientId : activeChannelId) || loadingMessages || uploading}
            />
            <button type="submit" disabled={!newMessage.trim() && (uploading || !(activeConversationType === "dm" ? activeRecipientId : activeChannelId))} className="px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-60">
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>

      {/* Right column */}
      <aside className="w-64 border-l hidden xl:block bg-white">
        <div className="p-3 border-b">Online Now</div>
        <div className="p-3 space-y-3">
          {activeConversationType === "dm" && activeRecipientId ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div>
                <div className="font-medium">{activeRecipientName}</div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
            </div>
          ) : activeConversationType === "channel" && activeChannelId ? (
            <div className="text-sm text-gray-500">Channel participants shown in channel list</div>
          ) : (
            <div className="text-sm text-gray-500">No conversation</div>
          )}
        </div>
      </aside>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded p-4 shadow-lg">
            <h4 className="text-lg font-semibold mb-2">Create channel</h4>

            <label className="block mb-2">
              <div className="text-sm text-gray-600">Name</div>
              <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="Team chat, Project A..." />
            </label>

            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">Add participants</div>
              <div className="max-h-40 overflow-auto border rounded p-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={selectedParticipantIds.map(String).includes(String(m.id))} onChange={() => toggleParticipantSelection(m.id)} />
                    <div className="text-sm">{m.name || m.username}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateChannel(false)} className="px-3 py-1 rounded border">
                Cancel
              </button>
              <button onClick={() => createChannel()} className="px-3 py-1 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
