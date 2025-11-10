"use client";
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useDropzone } from 'react-dropzone';
import { Card, Table, Form, Button, Modal } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import ProjectOverviewChart from '@/components/dbchart/ProjectOverviewChart';
import TeamProductivityChart from '@/components/dbchart/TeamProductivityChart';

// Role selector modal component
function RoleSelectorModal({
  show,
  onConfirm,
  onClose,
}: {
  show: boolean;
  onConfirm: (role: string, details?: { experience?: string; skills?: string; developerType?: string }) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [experience, setExperience] = useState<string>('');
  const [skills, setSkills] = useState<string>('');
  const [developerType, setDeveloperType] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setSelected(null);
      setExperience('');
      setSkills('');
      setDeveloperType(null);
    } else {
      // If session already had values, prefill them (whoami populates sessionStorage)
      const storedRole = sessionStorage.getItem('userRole');
      if (storedRole) setSelected(storedRole);
      const storedExp = sessionStorage.getItem('userExperience');
      const storedSkills = sessionStorage.getItem('userSkills');
      const storedDevType = sessionStorage.getItem('userDeveloperType');
      if (storedExp) setExperience(storedExp);
      if (storedSkills) setSkills(storedSkills);
      if (storedDevType) setDeveloperType(storedDevType);
    }
  }, [show]);

  // require developerType too when member selected
  const isContinueDisabled =
    !selected ||
    (selected === 'member' && (!experience.trim() || !skills.trim() || !developerType));

  return (
    <Modal contentClassName='border-0 rounded-4 g-shadow g-modal-conntent-wrapper' show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Select your role for this session</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Please confirm whether you are a Project Owner, Project Manager or Member. This will apply for the current login session.</p>
        <Form>
          <Form.Check
            type="radio"
            id="role-owner"
            name="userRole"
            label="Project Owner"
            checked={selected === 'owner'}
            onChange={() => setSelected('owner')}
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="role-manager"
            name="userRole"
            label="Project Manager"
            checked={selected === 'manager'}
            onChange={() => setSelected('manager')}
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="role-member"
            name="userRole"
            label="Member"
            checked={selected === 'member'}
            onChange={() => setSelected('member')}
            className="mb-2"
          />

          {/* Extra fields for Members */}
          {selected === 'member' && (
            <>
              <hr />
              <Form.Group className="mb-2" controlId="memberExperience">
                <Form.Label>Years of experience</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="e.g. 3"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </Form.Group>

              <Form.Group controlId="memberSkills" className="mb-2">
                <Form.Label>Skills (comma separated)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="e.g. React, Django, Postgres"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
                <Form.Text className="text-muted">List a few key skills or tools you work with.</Form.Text>
              </Form.Group>

              {/* Developer type (added after experience & skills) */}
              <Form.Group controlId="memberDeveloperType" className="mb-2">
                <Form.Label>Developer type</Form.Label>
                <Form.Select
                  value={developerType ?? ''}
                  onChange={(e) => setDeveloperType(e.target.value || null)}
                >
                  <option value="">Select developer type</option>
                  <option value="web">Web Developer</option>
                  <option value="mobile">Mobile Developer</option>
                  <option value="uiux">UI/UX Designer</option>
                  <option value="other">Other</option>
                </Form.Select>
                <Form.Text className="text-muted">Choose the best fit for your primary role (required for members).</Form.Text>
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <button className="g-btn-secondary d-none" onClick={onClose}>Cancel</button>
        <button
          className="g-btn"
          onClick={() =>
            selected
              ? onConfirm(selected, selected === 'member' ? { experience: experience.trim(), skills: skills.trim(), developerType: developerType ?? '' } : undefined)
              : undefined
          }
          disabled={isContinueDisabled}
        >
          Continue
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Home() {
  const [username, setUsername] = useState<string>('Loading…');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  // Redirect unauthenticated users and fetch username
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/userLogin');
      return;
    }

    // Helper to extract last-login-like fields from server responses
    const getServerLastLogin = (data: any) => {
      return data?.last_login ?? data?.lastLogin ?? data?.last_login_at ?? null;
    };

    fetch('http://127.0.0.1:8000/api/auth/whoami/', {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setUsername(data.username);

        // If server returned member_profile, stash it so the modal pre-fills
        if (data.member_profile) {
          const mp = data.member_profile;
          if (mp.role) sessionStorage.setItem('userRole', String(mp.role));
          if (mp.experience !== undefined && mp.experience !== null) sessionStorage.setItem('userExperience', String(mp.experience));
          if (mp.skills) sessionStorage.setItem('userSkills', String(mp.skills));
          if (mp.developer_type) sessionStorage.setItem('userDeveloperType', String(mp.developer_type));
        }

        // 1) If the login page explicitly set a flag after login, honor it (most robust)
        const justLoggedIn = localStorage.getItem('justLoggedIn');
        if (justLoggedIn === '1') {
          // show modal and clean the flag
          setRoleModalOpen(true);
          localStorage.removeItem('justLoggedIn');

          // persist detection tokens so the same login won't re-trigger again
          const serverLastLogin = getServerLastLogin(data);
          if (serverLastLogin) localStorage.setItem('lastLoginSeen', serverLastLogin);
          localStorage.setItem('lastTokenSeen', token);
          return;
        }

        // 2) Preferred: server-provided last_login timestamp detection
        const serverLastLogin = getServerLastLogin(data);
        if (serverLastLogin) {
          const prevSeen = localStorage.getItem('lastLoginSeen');
          if (prevSeen !== serverLastLogin) {
            // a new login was detected
            setRoleModalOpen(true);
            localStorage.setItem('lastLoginSeen', serverLastLogin);
            // (we don't set sessionStorage.roleAnswered here — wait for user's choice)
            return;
          } else {
            // not a new login — restore previously chosen role for this session if available
            const role = sessionStorage.getItem('userRole');
            if (role) setUserRole(role);
            return;
          }
        }

        // 3) Fallback: detect token change (works if token changes on each login)
        const prevTokenSeen = localStorage.getItem('lastTokenSeen');
        if (prevTokenSeen !== token) {
          // token changed => assume new login
          setRoleModalOpen(true);
          localStorage.setItem('lastTokenSeen', token);
          return;
        }

        // Final fallback: ask once per browser session (so users aren't spammed while navigating)
        const askedThisSession = sessionStorage.getItem('roleAnswered');
        if (!askedThisSession) {
          setRoleModalOpen(true);
        } else {
          const role = sessionStorage.getItem('userRole');
          if (role) setUserRole(role);
        }
      })
      .catch(() => {
        router.push('/user-login');
      });
  }, [router]);

  // Handler when user confirms role in modal
  const handleRoleConfirm = (role: string, details?: { experience?: string; skills?: string; developerType?: string }) => {
    // store for this session only (ask every login): use sessionStorage
    sessionStorage.setItem('userRole', role);
    sessionStorage.setItem('roleAnswered', '1'); // prevents re-asking until session ends
    setUserRole(role);

    if (role === 'member' && details) {
      sessionStorage.setItem('userExperience', details.experience ?? '');
      sessionStorage.setItem('userSkills', details.skills ?? '');
      sessionStorage.setItem('userDeveloperType', details.developerType ?? '');
    } else {
      // remove any previous member-specific data
      sessionStorage.removeItem('userExperience');
      sessionStorage.removeItem('userSkills');
      sessionStorage.removeItem('userDeveloperType');
    }

    setRoleModalOpen(false);

    // Persist server-side: POST to your Django endpoint
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found; cannot persist role to backend.');
      return;
    }

    const payload: any = { role };
    if (role === 'member') {
      // convert experience to integer if possible, else null
      const exp = details?.experience ? Number(details.experience) : null;
      payload.experience = Number.isNaN(exp) ? null : exp;
      payload.skills = details?.skills ?? '';
      payload.developer_type = details?.developerType ?? null;
    } else {
      payload.experience = null;
      payload.skills = '';
      payload.developer_type = null;
    }

    fetch('http://127.0.0.1:8000/api/user/role/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`, // adjust if you use Bearer/JWT
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Failed to persist role: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((json) => {
        console.log('Saved member profile on backend:', json);
        // keep local sessionStorage in-sync with server-validated values
        if (json.role) sessionStorage.setItem('userRole', String(json.role));
        if (json.experience !== undefined && json.experience !== null) sessionStorage.setItem('userExperience', String(json.experience));
        if (json.skills) sessionStorage.setItem('userSkills', String(json.skills));
        if (json.developer_type) sessionStorage.setItem('userDeveloperType', String(json.developer_type));
      })
      .catch((err) => {
        console.warn('Could not save role to backend:', err);
        // Optional: show UI toast here to inform user; currently just logs
      });
  };

  const handleRoleCancel = () => {
    // If user cancels — default to "member" (keep behaviour you had)
    sessionStorage.setItem('userRole', 'member');
    sessionStorage.setItem('roleAnswered', '1');
    setUserRole('member');

    // don't set experience/skills/devtype (user cancelled), but you could set defaults if desired
    sessionStorage.removeItem('userExperience');
    sessionStorage.removeItem('userSkills');
    sessionStorage.removeItem('userDeveloperType');

    setRoleModalOpen(false);
  };

  // Compute current date & day:
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  const users = [
    { name: 'Jenny Wilson', email: 'w.lawson@example.com', time: 'just now', location: 'Austin', image: '/assets/images/recent-log.svg' },
    { name: 'Devon Lane', email: 'dat.roberts@example.com', time: '2 hr ago', location: 'New York', image: '/assets/images/recent-log.svg' },
    { name: 'Jane Cooper', email: 'jgraham@example.com', time: '2 hr ago', location: 'Toledo', image: '/assets/images/recent-log.svg' },
    { name: 'Dianne Russell', email: 'curtis.d@example.com', time: '1 hr ago', location: 'Naperville', image: '/assets/images/recent-log.svg' },
  ];

  // for chart data (kept in case charts need static data internally)
  const data = [
    { day: 'Mon', value: 2, color: '#DCCEFF' },
    { day: 'Tue', value: 8, color: '#DCCEFF' },
    { day: 'Wed', value: 6, color: '#DCCEFF' },
    { day: 'Thu', value: 4, color: '#DCCEFF' },
    { day: 'Fri', value: 3, color: '#DCCEFF' },
    { day: 'Sat', value: 5, color: '#DCCEFF' },
    { day: 'Sun', value: 6, color: '#DCCEFF' },
  ];

  const Invite_members = [
    { name: 'Invitation Sent', value: 3, color: '#EB795F' },
    { name: 'Accepted', value: 19, color: '#FFBB58' },
    { name: 'Logged In', value: 15, color: '#00A982' },
    { name: 'Tracked Time', value: 15, color: '#FE3A3C' },
  ];

  // for members table 
  const membersData = [
    { rank: 1, name: 'Hamza', team: 'Development', accomplished: 98, inprogress: 120, activityHours: 45 },
    { rank: 2, name: 'Ali', team: 'QA', accomplished: 95, inprogress: 110, activityHours: 42 },
    { rank: 3, name: 'Usman', team: 'UX Design', accomplished: 92, inprogress: 105, activityHours: 40 },
    { rank: 4, name: 'Anees', team: 'SEO', accomplished: 90, inprogress: 98, activityHours: 38 },
    { rank: 5, name: 'Azam', team: 'Marketing', accomplished: 88, inprogress: 70, activityHours: 37 },
  ];

  const [search, setSearch] = useState('');

  const filteredMembers = membersData.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase())
  );

  // for members activity table
  const membersActivityData = [
    { projectname: 'Design Homepage UI', assignedTo: 'Hamza', techteam: 'Backend', deadline: '12-6-25', priority: 'High', status: 'In Progress' },
    { projectname: 'Backend API Development', assignedTo: 'Usman', techteam: 'Frontend', deadline: '12-6-25', priority: 'High', status: 'Not Started' },
    { projectname: 'Bug Fixing (Login Issue)', assignedTo: 'Ali', techteam: 'QA', deadline: '12-6-25', priority: 'Medium', status: 'Completed' },
    { projectname: 'Content Writing (Landing Page)', assignedTo: 'Azam', techteam: 'Marketing', deadline: '12-6-25', priority: 'Low', status: 'In Progress' },
    { projectname: 'SEO Optimization', assignedTo: 'Farhan', techteam: 'Seo', deadline: '12-6-25', priority: 'Medium', status: 'Not Started' },
  ];

  const [searchProject, setsearchProject] = useState('');

  const filteredActivities = membersActivityData.filter((activity) =>
    activity.projectname.toLowerCase().includes(searchProject.toLowerCase())
  );

  const data2 = [
    { name: 'Mon', value: 2, color: '#F4B740' },
    { name: 'Tue', value: 8, color: '#00A86B' },
    { name: 'Wed', value: 6, color: '#E2C5FF' },
    { name: 'Thu', value: 4, color: '#FF4B4B' },
    { name: 'Fri', value: 3, color: '#E9815A' },
    { name: 'Sat', value: 5, color: '#5E2D92' },
    { name: 'Sun', value: 6, color: '#FFB946' },
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Dropped files:', acceptedFiles);
    // Handle file upload logic here
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <>
      <RoleSelectorModal show={roleModalOpen} onConfirm={handleRoleConfirm} onClose={handleRoleCancel} />

      <div className="container">
        <div className="row mt-4 mb-4">
          <div className="col-lg-12 mb-5 px-lg-3 px-0">
            <Card className="d-flex flex-row align-items-center p-3 border-0 rounded-3 g-shadow card_wrapper_bg_grad">
              <div
                className="d-flex align-items-center me-3 text-white rounded-3 justify-content-center d-sm-flex d-none"
                style={{ width: '50px', height: '50px', fontWeight: 'bold', fontSize: '18px', background: '#6D2EBB' }}
              >
                {username[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-0">{username}</h6>
                <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                  {username}’s Workplace — <strong style={{ color: '#ffffff' }}>{userRole ?? 'role not set'}</strong>
                </p>
                <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                  <i className="bi bi-person" /> Owner
                </p>
              </div> <div className="text-end">
                <p className="mb-0" style={{ fontSize: '14px' }}>{formattedDate}</p>
                <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>{dayName}</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="card_wrapper_bg_grad px-4 pt-5 pb-3 mb-4">
          <div className="row">
            {[
              {
                src: '/assets/images/pm.svg',
                title: 'Project Management',
                url: '/dashboard/Projects/Createproject',
              },
              {
                src: '/assets/images/tm.svg',
                title: 'Smart Task Management',
                url: '/dashboard/task-new/addtask',
              },
              {
                src: '/assets/images/rtm.svg',
                title: 'Real-Time Monitoring',
                url: '/dashboard/member-monitoring',
              },
              {
                src: '/assets/images/um.svg',
                title: 'User Management',
                url: '/dashboard/user-management',
              },
            ].map((item, index) => (
              <div key={index} className="col-lg-3 mb-4 px-lg-3 px-0 d-t-c">
                <a href={item.url} className="text-decoration-none">
                  <div className="card dashboard-top-cards p-3 text-center">
                    <Image src={item.src} alt={item.title} width={50} height={50} />
                    <div className="card-body">
                      <h5 className="card-title">{item.title}</h5>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="row db-home-sec-divide mb-4">
          <div className="col-lg-8 mb-4 px-lg-3 px-0">
            <TeamProductivityChart />
          </div>
          <div className="col-lg-4 mb-4 px-lg-3 px-0">
            <div className="card p-3 g-shadow border-0 rounded-3 text-white h-100" style={{ backgroundColor: '#A259FF' }}>
              <h6 className="fw-bold">Recent Login</h6>
              <p className="mb-3" style={{ fontSize: '14px' }}>Recent login details</p>
              <ul className="list-unstyled">
                {users.map((user, index) => (
                  <li key={index} className="d-flex align-items-center mb-3">
                    <img src={user.image} alt={user.name} className="rounded-circle me-2" width="40" height="40" />
                    <div className="flex-grow-1">
                      <h6 className="mb-0 text-white" style={{ fontSize: '14px' }}>{user.name}</h6>
                      <p className="mb-0 text-white-50" style={{ fontSize: '12px' }}>{user.email}</p>
                    </div>
                    <div className="text-end">
                      <p className="mb-0 text-white" style={{ fontSize: '12px' }}>{user.time}</p>
                      <p className="mb-0 text-white-50" style={{ fontSize: '12px' }}>{user.location}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mb-0 fw-bold text-white-50" style={{ fontSize: '14px', cursor: 'pointer' }}>SEE ALL &gt;</p>
            </div>
          </div>
        </div>

        <div className="row db-home-sec-divide mb-4">
          <div className="col-lg-12">
            <div className="row">
              <div className="col-lg-4 px-lg-3 px-0 mb-4">

                <Card className="d-flex justify-content-center g-shadow h-100 invite-member-card" >
                  <Card.Body className="text-center">
                    {/* Header with Icon */}
                    <div className="d-flex justify-content-between align-items-center">
                      <Card.Title className="fw-bold">Invite New Members</Card.Title>
                      <div className="p-2 rounded-circle" style={{ boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', background: '#EDDFFE ' }}>
                        <Image src="/assets/images/invite.svg" alt="" width={50} height={50} />
                      </div>
                    </div>

                    {/* Subtitle */}
                    <p className="mt-2">Invite Members by Email or Link</p>

                    {/* Invite Button */}
                    <Button style={{ backgroundColor: '#A54EF5', border: 'none', padding: '8px 16px', borderRadius: '6px' }}>
                      + Invite
                    </Button>
                  </Card.Body>
                </Card>

              </div>
              <div className="col-lg-8 px-lg-3 px-0 mb-4">
                <div className="chart-container g-shadow p-4 rounded-4 bg-white">

                  <h5 className="card-title mx-auto text-center mb-2">Project Overview</h5>

                  <ProjectOverviewChart />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row db-home-sec-divide mb-4 px-3">
          <div className="col-lg-12">
            <div className=" row db-home-sec-divide mb-4 ">
              <div className="col-lg-12 mb-4 px-lg-3 px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <h4 className="fw-bold">Weekly Task Summary</h4>

                  {/* Search Bar */}
                  <Form.Control
                    type="text"
                    placeholder="Search members here"
                    className="mb-3 top-members-search g-shadow rounded-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                </div>

                {/* Table */}
                <div className="table-responsive g-table-wrap g-t-scroll">
                  <Table hover className="text-center g-table">
                    <thead>
                      <tr className="text-white" style={{ backgroundColor: '#A54EF5' }}>
                        <th></th>
                        <th>Name</th>
                        <th>Team</th>
                        <th>Accomplished Task</th>
                        <th>In-Progress Task</th>
                        <th>Activity Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.rank} style={{ backgroundColor: '#F7ECFF' }}>
                          <td className="fw-bold">{member.rank}</td>
                          <td>{member.name}</td>
                          <td>{member.team}</td>
                          <td>{member.accomplished}</td>
                          <td>{member.inprogress}</td>

                          <td>{member.activityHours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>

            </div>


            <div className="row db-home-sec-divide mb-4">
              <div className="col-lg-12 mb-4 px-lg-3 px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <h4 className="fw-bold">Project Overview</h4>

                  {/* Search Bar */}
                  <Form.Control
                    type="text"
                    placeholder="Search members here"
                    className="mb-3 top-members-search g-shadow rounded-10"
                    value={searchProject}
                    onChange={(e) => setsearchProject(e.target.value)}
                  />

                </div>

                {/* Table */}
                <div className="table-responsive g-table-wrap g-t-scroll">
                  <Table hover className="text-center g-table">
                    <thead>
                      <tr className="text-white" style={{ backgroundColor: '#A54EF5' }}>
                        <th>Project Name</th>
                        <th>Assigned To</th>
                        <th>Tech Team</th>
                        <th>Deadline</th>
                        <th>Priority</th>
                        <th>Status</th>

                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((activity, index) => (
                        <tr key={index} style={{ backgroundColor: '#F7ECFF' }}>
                          <td>{activity.projectname}</td>
                          <td>{activity.assignedTo}</td>
                          <td>{activity.techteam}</td>
                          <td><span>{activity.deadline}</span></td>
                          <td>{activity.priority}</td>
                          <td>{activity.status}</td>

                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>


          </div>
        </div>

      </div>
    </>
  );
}
