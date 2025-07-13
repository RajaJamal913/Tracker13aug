"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Send, Paperclip, Phone, Video, MoreVertical, Search, Users, Settings } from "lucide-react"

interface User {
  id: string
  name: string
  avatar: string
  status: "online" | "away" | "busy" | "offline"
}

interface Channel {
  id: string
  name: string
  type: "channel" | "direct"
  participants: User[]
  unreadCount: number
  lastMessage?: string
  lastMessageTime?: Date
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: Date
  type: "text" | "file" | "image"
  fileUrl?: string
  fileName?: string
}

const mockUsers: User[] = [
  { id: "1", name: "John Doe", avatar: "/assets/images/chat-avatar.png", status: "online" },
  { id: "2", name: "Jane Smith", avatar: "/assets/images/chat-avatar.png", status: "away" },
  { id: "3", name: "Mike Johnson", avatar: "/assets/images/chat-avatar.png", status: "online" },
  { id: "4", name: "Sarah Wilson", avatar: "/assets/images/chat-avatar.png", status: "busy" },
  { id: "5", name: "Alex Brown", avatar: "/assets/images/chat-avatar.png", status: "online" },
]

const mockChannels: Channel[] = [
  {
    id: "1",
    name: "General",
    type: "channel",
    participants: mockUsers,
    unreadCount: 2,
    lastMessage: "Great work on the project!",
    lastMessageTime: new Date(Date.now() - 300000),
  },
  {
    id: "2",
    name: "Development Team",
    type: "channel",
    participants: mockUsers.slice(0, 3),
    unreadCount: 0,
    lastMessage: "The new feature is ready for testing",
    lastMessageTime: new Date(Date.now() - 600000),
  },
  {
    id: "3",
    name: "Jane Smith",
    type: "direct",
    participants: [mockUsers[1]],
    unreadCount: 1,
    lastMessage: "Can we schedule a meeting?",
    lastMessageTime: new Date(Date.now() - 900000),
  },
  {
    id: "4",
    name: "Project Alpha",
    type: "channel",
    participants: mockUsers.slice(1),
    unreadCount: 5,
    lastMessage: "Updated the requirements document",
    lastMessageTime: new Date(Date.now() - 1200000),
  },
]

export default function ChatPage() {
  const [currentUser] = useState<User>(mockUsers[0])
  const [activeChannel, setActiveChannel] = useState<Channel>(mockChannels[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  // Mock messages for the active channel
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: "1",
        senderId: "2",
        content: "Hey everyone! How is the project going?",
        timestamp: new Date(Date.now() - 3600000),
        type: "text",
      },
      {
        id: "2",
        senderId: "1",
        content: "Going well! We just finished the authentication module.",
        timestamp: new Date(Date.now() - 3000000),
        type: "text",
      },
      {
        id: "3",
        senderId: "3",
        content: "Great work team! Here's the latest design mockup.",
        timestamp: new Date(Date.now() - 1800000),
        type: "image",
        fileUrl: "/placeholder.svg?height=200&width=300",
        fileName: "design-mockup.png",
      },
      {
        id: "4",
        senderId: "1",
        content: "Looks fantastic! The UI is really coming together.",
        timestamp: new Date(Date.now() - 900000),
        type: "text",
      },
    ]
    setMessages(mockMessages)
  }, [activeChannel])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      content: newMessage,
      timestamp: new Date(),
      type: "text",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")

    // Simulate typing indicator
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      // Simulate response
      const response: Message = {
        id: (Date.now() + 1).toString(),
        senderId: "2",
        content: "Thanks for the update!",
        timestamp: new Date(),
        type: "text",
      }
      setMessages((prev) => [...prev, response])
    }, 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      content: `Shared a file: ${file.name}`,
      timestamp: new Date(),
      type: "file",
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
    }

    setMessages((prev) => [...prev, message])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatLastMessageTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "now"
    if (minutes < 60) return `${minutes}m`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
    return `${Math.floor(minutes / 1440)}d`
  }

  const filteredChannels = mockChannels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="d-flex h-screen bg-gray-50 chat-pannel-main-wrap">
      {/* Chat Channels Sidebar */}
      <div className="w-80 border border-gray-200 d-flex flex-col chat-sidebar-wrapper">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Messages</h2>
            {/* <button className="p-2 text-gray-400 hover: rounded-lg hover:bg-gray-100 d-none">
              <Settings size={20} />
            </button> */}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className=" absolute left-3 top-1/2 transform -translate-y-1/2 " size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2  rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent chat-search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Channels List */}

        <div className="flex-1 overflow-y-auto g-scroll">
          <div className="chanells py-2 px-3 d-flex justify-content-between align-items-center border-b border-gray-100">
            <span className="fw-bold text-white">Channels</span> <a href="" className="fs-3 text-decoration-none text-white">+</a>
          </div>
          <div className="chanells py-2 px-3 d-flex justify-content-between align-items-center border-b border-gray-100">
            <span className="fw-bold text-white">Direct Message</span> <a href="" className="fs-3 text-decoration-none text-white">+</a>
          </div>
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors chats-box-wrap ${activeChannel.id === channel.id ? "chat-active-color border-r-2 border-r-blue-500" : ""
                }`}
              onClick={() => setActiveChannel(channel)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                     <img
                      src="/assets/images/chat-avatar.png"
                      // alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover mr-2"
                    />
                  {/* <span className="text-lg mr-2">{channel.type === "channel" ? "#" : "💬"}</span> */}
                  <span className="font-medium text-white truncate">{channel.name}</span>
                </div>
                {channel.lastMessageTime && (
                  <div className="d-flex">
                    <span className="text-xs text-white">{formatLastMessageTime(channel.lastMessageTime)}</span>
   
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between position-relative">
                <div className="d-flex justify-content-between align-items-center w-100">
                <p className="text-sm text-white truncate flex-1 mr-2 mb-0">{channel.lastMessage || "No messages yet"}</p>
<span><svg style={{width:"20px", height:"20px"}} xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 -0.5 25 25" fill="none">
<path style={{fill:"blue"}} d="M5.03033 11.4697C4.73744 11.1768 4.26256 11.1768 3.96967 11.4697C3.67678 11.7626 3.67678 12.2374 3.96967 12.5303L5.03033 11.4697ZM8.5 16L7.96967 16.5303C8.26256 16.8232 8.73744 16.8232 9.03033 16.5303L8.5 16ZM17.0303 8.53033C17.3232 8.23744 17.3232 7.76256 17.0303 7.46967C16.7374 7.17678 16.2626 7.17678 15.9697 7.46967L17.0303 8.53033ZM9.03033 11.4697C8.73744 11.1768 8.26256 11.1768 7.96967 11.4697C7.67678 11.7626 7.67678 12.2374 7.96967 12.5303L9.03033 11.4697ZM12.5 16L11.9697 16.5303C12.2626 16.8232 12.7374 16.8232 13.0303 16.5303L12.5 16ZM21.0303 8.53033C21.3232 8.23744 21.3232 7.76256 21.0303 7.46967C20.7374 7.17678 20.2626 7.17678 19.9697 7.46967L21.0303 8.53033ZM3.96967 12.5303L7.96967 16.5303L9.03033 15.4697L5.03033 11.4697L3.96967 12.5303ZM9.03033 16.5303L17.0303 8.53033L15.9697 7.46967L7.96967 15.4697L9.03033 16.5303ZM7.96967 12.5303L11.9697 16.5303L13.0303 15.4697L9.03033 11.4697L7.96967 12.5303ZM13.0303 16.5303L21.0303 8.53033L19.9697 7.46967L11.9697 15.4697L13.0303 16.5303Z" fill="#000000"/>
</svg></span>
                </div>
                {channel.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center" style={{position:"absolute",bottom:"0px",right:"0px"}}>
                    {channel.unreadCount}
                  </span>
                  
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col chat-read-area-wrap">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* <span className="text-2xl mr-3">{activeChannel.type === "channel" ? "#" : "💬"}</span> */}
              <div>
                <h3 className="text-lg font-semibold text-dark">{activeChannel.name}</h3>
                <p className="text-sm text-gray-500 mb-0">
                  {activeChannel.participants.length} member{activeChannel.participants.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* <div className="flex items-center space-x-2 d-none">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Phone size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Video size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Users size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <MoreVertical size={20} />
              </button>
            </div> */}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 g-scroll">
          {messages.map((message) => {
            const sender = mockUsers.find((u) => u.id === message.senderId)
            const isOwn = message.senderId === currentUser.id

            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs sender-chat lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
                  {!isOwn && (
                    <div className="flex items-center mb-1">
                      <div className="w-6 h-6 rounded-full  flex items-center justify-center text-white text-xs font-medium mx-2 mb-1">
                        {/* {sender?.avatar} */}
                        <img
                          src={sender?.avatar}
                          alt={sender?.name}
                          className="w-8 h-8 rounded-full object-cover mr-2"
                        />
                      </div>
                      <span className="text-sm font-medium text-dark">{sender?.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
                    </div>
                  )}

                  <div
                    className={`rounded-lg px-4 py-2 ${isOwn ? "chat-theme-primary text-black" : "chat-sender-txt-bg text-white"}`} style={{ boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" }}
                  >
                    {message.type === "image" && message.fileUrl && (
                      <div className="mb-2">
                        <img
                          src={message.fileUrl || "/placeholder.svg"}
                          alt={message.fileName}
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    )}

                    {message.type === "file" && (
                      <div className="flex items-center mb-2 p-2 bg-white bg-opacity-20 rounded">
                        <Paperclip size={16} className="mr-2" />
                        <span className="text-sm">{message.fileName}</span>
                      </div>
                    )}

                    <p className="text-sm">{message.content}</p>
                  </div>

                  {isOwn && (
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-xs">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Someone is typing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-3">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">

            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              onClick={() => fileInputRef.current?.click()}
            >
              <img src="/assets/images/Image-file.svg" alt="" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              onClick={() => fileInputRef2.current?.click()}
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                style={{border:"1px solid #9A4AFD !important"}}
                // placeholder={`Message ${activeChannel.name}...`}
                placeholder={`Type a message...`}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="p-2 text-white transition-colors rounded-2" style={{background:"#9A4AFD"}}
              disabled={!newMessage.trim()}
            >
              <Send size={20} />
            </button>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <input
            ref={fileInputRef2}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </div>
      </div>



      {/* Online Users Panel (Optional) */}
      <div className="w-64 bg-white border-l border-gray-200  hidden xl:block">
        <h3 className="text-lg font-semibold text-dark mb-0 p-3 d-flex align-items-center " style={{ height: "78px", borderBottom: "1px solid #dedede" }}>Online Now</h3>
        {/* <div className="online-chat-img-wrap d-flex justify-content-center align-items-center">
          <img src="\assets\images\online-chat.png" alt="" />
        </div> */}
        <div className="space-y-3 p-3">
          {mockUsers
            .filter((user) => user.status === "online")
            .map((user) => (
              <div key={user.id} className="d-flex align-items-center">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {/* {user.avatar} */}
                    <img
                      src={user?.avatar}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover mr-2"
                    />
                  </div>
                  <div
                    className={`absolute w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}
                  style={{right:"0px", bottom:"2px"}}></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-dark mb-0">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize mb-0">{user.status}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
