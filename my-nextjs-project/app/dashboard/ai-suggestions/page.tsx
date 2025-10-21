'use client'

import React, { useEffect, useState } from 'react'

export default function AiSuggestion() {
  // fallback static list (used only if fetch fails)
  const fallbackCardDataList = [
    {
      id: 'f-1',
      name: "Hamza",
      task: "Home Page UI Design",
      reason: "Expertise in UX/UI & current load is low",
      experience: "4",
      match: "70% Match",
      skills: ["Testing", "Backend", "Quality"],
      profileImg: "/assets/images/profile-img.jpg",
      topImg: "/assets/images/sugg_card_top_img.svg",
      developerType: "uiux",
    },
    {
      id: 'f-2',
      name: "Ayesha",
      task: "Mobile App Wireframe",
      reason: "Fast delivery & attention to detail",
      experience: "2",
      match: "85% Match",
      skills: ["UX", "Research", "Prototyping"],
      profileImg: "/assets/images/profile-img.jpg",
      topImg: "/assets/images/sugg_card_top_img.svg",
      developerType: "mobile",
    },
    {
      id: 'f-3',
      name: "Ali",
      task: "Dashboard Backend API",
      reason: "Skilled in Django & available",
      experience: "3",
      match: "65% Match",
      skills: ["Django", "API", "Database"],
      profileImg: "/assets/images/profile-img.jpg",
      topImg: "/assets/images/sugg_card_top_img.svg",
      developerType: "web",
    },
    {
      id: 'f-4',
      name: "Sara",
      task: "Landing Page SEO",
      reason: "SEO expert with light workload",
      experience: "5",
      match: "90% Match",
      skills: ["SEO", "Content", "Strategy"],
      profileImg: "/assets/images/profile-img.jpg",
      topImg: "/assets/images/sugg_card_top_img.svg",
      developerType: "other",
    },
  ]

  // state for members from backend
  const [members, setMembers] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('token') // optional auth header

    async function loadMembers() {
      setLoading(true)
      setError(null)

      // primary and fallback endpoints (adjust if your API is mounted differently)
      const endpoints = [
        'http://127.0.0.1:8000/api/members/',
    
      ]

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: token ? { Authorization: `Token ${token}` } : undefined,
          })
          if (res.status === 404) {
            // try next endpoint
            continue
          }
          if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`)
          const json = await res.json()
          if (!cancelled) {
            // Expecting an array of Member objects with: id, username, role, experience, skills, developer_type
            if (Array.isArray(json)) {
              setMembers(json)
            } else if (json.results && Array.isArray(json.results)) {
              // in case of paginated DRF response
              setMembers(json.results)
            } else {
              // unknown shape -> try to coerce
              setMembers(Array.isArray(json) ? json : [])
            }
            setLoading(false)
            return
          }
        } catch (err: any) {
          // keep trying next endpoint
          console.warn('members fetch attempt failed:', url, err)
        }
      }

      // all attempts failed -> use fallback
      if (!cancelled) {
        setMembers(null)
        setLoading(false)
        setError('Could not load members from server; showing sample suggestions.')
      }
    }

    loadMembers()
    return () => {
      cancelled = true
    }
  }, [])

  const devTypeFriendly = (val?: string | null) => {
    if (!val) return '—'
    const v = String(val).toLowerCase()
    switch (v) {
      case 'web':
        return 'Web Developer'
      case 'mobile':
        return 'Mobile Developer'
      case 'uiux':
      case 'ui/ux':
      case 'ui-ux':
        return 'UI/UX Designer'
      case 'other':
        return 'Other'
      default:
        return val
    }
  }

  // Helper to convert a Member object into card data
  const mapMemberToCard = (m: any) => {
    const username = m.username || (m.user && (m.user.username || m.user.email)) || `Member#${m.id}`
    const role = m.role || 'member'
    const experience = (m.experience !== undefined && m.experience !== null) ? String(m.experience) : ''
    const skillsRaw = m.skills || m.skill || ''
    // skills might be comma-separated string or array
    const skillsArr = Array.isArray(skillsRaw)
      ? skillsRaw
      : String(skillsRaw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

    // developer type may come as developer_type or developerType
    const developerType = m.developer_type ?? m.developerType ?? m.developerTypeName ?? null

    // generate a simple "match" indicator (purely UI; adjust logic server-side later)
    let matchPct = 50
    if (experience) {
      const expNum = Number(experience)
      if (!Number.isNaN(expNum)) matchPct = Math.min(95, 50 + expNum * 8)
    }
    const matchLabel = `${matchPct}% Match`

    return {
      id: m.id,
      name: username,
      role,
      task: m.suggested_task ?? 'Suggested task', // frontend placeholder (backend can return suggested_task later)
      reason: m.reason ?? `Role: ${role}`,
      experience,
      match: matchLabel,
      skills: skillsArr,
      profileImg: m.profile_image ?? '/assets/images/profile-img.jpg',
      topImg: m.top_image ?? '/assets/images/sugg_card_top_img.svg',
      developerType,
    }
  }

  const renderCards = (list: any[]) => {
    return list.map((cardData, idx) => (
      <div className="col-lg-3 mb-4" key={cardData.id ?? idx}>
        <div className="card border-0 shadow ai-sugg-card text-center p-3 position-relative h-100">
          <img className="sugg_card_top_img" src={cardData.topImg} alt="Top" />

          <div className="card-header position-relative p-0 mb-3 rounded-top">
            <div className="avatar-container">
              <img src={cardData.profileImg} alt="Avatar" className="rounded-circle avatar-img" />
            </div>
          </div>

          <div className="card-body p-2 sugg-card-data-wrap">
            <ul className="sugg-card-data-wrap">
              <li style={{ color: "#6E34B5" }}>{cardData.name}</li>
              <li>{cardData.task}</li>
              <li>Reason: {cardData.reason}</li>
              <li>
                <span>Exp: {cardData.experience || '—'}</span>{" "}
                <span style={{ float: 'right' }}>{cardData.match}</span>
              </li>

              {/* Developer type shown after experience & skills */}
              <li>
                <strong>Developer:</strong> {devTypeFriendly(cardData.developerType)}
              </li>
            </ul>

            <div className="mb-4 d-flex justify-content-between flex-wrap">
              {(cardData.skills || []).map((tag: string, index: number) => (
                <span key={index} className="badge bg-light text-dark rounded-pill mx-1 my-1">
                  {tag}
                </span>
              ))}
            </div>

            <div className="d-flex justify-content-center gap-2">
              <button className="btn g-btn" onClick={() => handleAssign(cardData)}>Assign</button>
              <button className="btn g-btn" onClick={() => handleViewProfile(cardData)}>View Profile</button>
            </div>
          </div>
        </div>
      </div>
    ))
  }

  // placeholder handlers (you can wire these to your assignment endpoints)
  const handleAssign = (cardData: any) => {
    // TODO: call backend assign API. For now just log.
    console.log('Assign clicked for', cardData)
    alert(`Assign: ${cardData.name} (implement API call)`)
  }

  const handleViewProfile = (cardData: any) => {
    // TODO: open profile drawer / navigate to profile
    console.log('View profile', cardData)
    alert(`View profile: ${cardData.name}`)
  }

  // Decide list to render: server members or fallback
  const cardsToRender = members && Array.isArray(members) && members.length > 0
    ? members.map(mapMemberToCard)
    : fallbackCardDataList

  return (
    <>
      <div className="container-fluid py-4">
        <div className=" row mb-3">
          <div className=" col-lg-12 d-flex justify-content-between align-items-center gap-2">
            <h2 className=" page-heading-wrapper">Smart Task Management</h2>
            <div className=" d-flex justify-content-between align-items-center gap-2">
              <button className=" btn g-btn">Add Task</button>
            </div>
          </div>
        </div>

        <section className="ai-suggestion-sec py-4">
          <div className="container-fluid py-4">
            <div className="row">
              <div className="col-lg-12 mb-3">
                <h2 className="page-title">Ai Suggestions</h2>
              </div>
            </div>

            {loading && <div className="mb-3">Loading suggestions…</div>}
            {error && <div className="mb-3 text-warning">{error}</div>}

            <div className="row">
              {renderCards(cardsToRender)}
            </div>
          </div>
        </section>

        {/* the rest of your sections (Assigned Tasks, Reasoning, Bottleneck) can stay unchanged */}
      </div>

      <style jsx>{`
        /* keep your existing styles (copy/paste only the necessary ones) */
        .page-title{
          font-weight: 600;
          font-size: 30px;
          background: linear-gradient(263.66deg, #9A4AFD 1.73%, #955ADD 53.99%, #6E34B5 98.27%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          line-height: normal;
        }
        .ai-suggestion-sec .ai-sugg-card {
          border-radius: 30px;
          overflow: hidden;
          background-size: 100%;
        }
        .ai-sugg-card:before {
          content: "";
          position: absolute;
          right: -40px;
          top: 31px;
          background: linear-gradient(263.66deg, rgba(154, 74, 253, 0.3483) 1.73%, rgba(149, 90, 221, 0.243) 7.99%, rgba(110, 52, 181, 0.243) 96.27%);
          filter: blur(40px);
          width: 50%;
          height: 76%;
        }
        .ai-suggestion-sec .sugg_card_top_img {
          position: absolute;
          left: 0px;
          top: 0px;
          filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.25));
        }
        .ai-suggestion-sec .ai-sugg-card .card-header {
          height: 110px;
          position: relative;
          background: transparent;
          border: none;
        }
        .ai-suggestion-sec .avatar-container {
          position: absolute;
          top: 35px;
          left: 50%;
          transform: translateX(-50%);
        }
        .ai-suggestion-sec .avatar-img {
          width: 80px;
          height: 80px;
          filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
        }
        .ai-suggestion-sec .sugg-card-data-wrap { text-align: start; padding: 0px; }
        .ai-suggestion-sec .sugg-card-data-wrap li {
          padding: 10px 0px;
          border-bottom: 1.5px solid #C291FF;
          font-weight: 700;
          font-size: 14px;
        }
        .ai-suggestion-sec .sugg-card-data-wrap .badge {
          background: #FFFFFF;
          box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.25);
          border-radius: 30px;
          padding: 7px 13px;
          width: fit-content;
        }
      `}</style>
    </>
  )
}
