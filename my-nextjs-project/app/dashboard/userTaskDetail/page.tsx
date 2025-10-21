'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

import TaskCompletionChart from "@/components/charts/task-completion-chart";
import ProductivityChart from "@/components/charts/monthly-productivity-chart";
import TaskModal from "@/components/manualTask/TaskModal";
import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";



export default function TaskMgt() {

const tasks = [
  {
    title: "Create Marketing Website",
    taskId: "GAWW-2",
    dueDate: "July 30",
    priority: "High",     // Adjusted instead of "July 30"
    status: "In Progress", // Adjusted instead of "July 30"
    assignee: "Ammad",
  },
  {
    title: "Redesign Landing Page",
    taskId: "GAWW-3",
    dueDate: "August 5",
    priority: "Medium",
    status: "Pending",
    assignee: "Sara",
  },
  {
    title: "Mobile App Authentication",
    taskId: "GAWW-4",
    dueDate: "August 10",
    priority: "High",
    status: "Completed",
    assignee: "Hamza",
  },
  {
    title: "SEO Optimization",
    taskId: "GAWW-5",
    dueDate: "August 12",
    priority: "Low",
    status: "In Review",
    assignee: "Ayesha",
  },
  {
    title: "Payment Gateway Integration",
    taskId: "GAWW-6",
    dueDate: "August 15",
    priority: "High",
    status: "Pending",
    assignee: "Ali",
  },
];


    
  
   
    return (
        <>
            <div className="container-fluid py-4 px-0">
                <div className="row mb-4">
                    <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
                        {/* <TimeCount /> */}
                        <h2 className="page-heading-wrapper">Task Management</h2>
                        <div className="d-flex justify-content-between align-items-center gap-2">
                            {/* <button className="btn g-btn" >+ Add Task Using AI</button>
                            <button className="btn g-btn" >+ Add Task Manually</button> */}
                        </div>
                        {/* <button className="btn btn-outline-secondary">Export</button> */}
                    </div>
                </div>
                <div className="row card_wrapper_bg_grad p-4 row w-100 mx-auto">

                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad ">
                            <div className="icon-circle mb-2">
                                <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.54909 27.7215L7.56221 26.7084H14.9744L10.2449 18.163L6.74743 18.8744C5.83022 19.0606 5.09831 19.7516 4.859 20.6567L0.70688 34.2072C0.511332 34.9446 0.670564 35.7315 1.13615 36.3349C1.60174 36.9402 2.32154 37.294 3.08511 37.294H6.55002L6.54909 27.7215Z" fill="white" />
                                    <path d="M30.5439 34.2072L26.3918 20.6567C26.1488 19.7404 25.4029 19.0448 24.4717 18.8679L20.9872 18.2086L16.2773 26.7075H24.2482L25.2613 27.7206V37.2922H28.1675C28.9302 37.2922 29.6509 36.9383 30.1165 36.3331C30.5812 35.7278 30.7376 34.9447 30.5439 34.2072Z" fill="white" />
                                    <path d="M8.57809 37.294H8.29688V37.2977L22.9555 37.2968V37.294H23.2358V28.7365H8.57809V37.294Z" fill="white" />
                                    <path d="M26.7201 38.214H4.52734V40.0465H26.7201V38.214Z" fill="white" />
                                    <path d="M7.72252 12.1838C7.76163 12.2639 7.81284 12.3868 7.86685 12.5153C8.08195 13.0331 8.25701 13.4195 8.50005 13.6467C9.62584 17.3202 12.5311 19.8633 15.618 19.8539C18.6918 19.8437 21.5617 17.2783 22.6456 13.5946C22.884 13.3655 23.0534 12.9809 23.2629 12.4669C23.316 12.3356 23.3644 12.2118 23.4026 12.1317C23.8189 11.2713 23.6755 10.3392 23.0935 9.88569C23.0935 9.85776 23.0935 9.82889 23.0935 9.80096C23.0795 5.24098 22.4845 0.377439 15.5509 0.400718C8.56616 0.423066 7.99815 5.08175 8.01304 9.85031C8.01304 9.87917 8.01398 9.90711 8.01398 9.93505C7.43665 10.395 7.30069 11.3281 7.72252 12.1838ZM8.69746 10.7154L8.71795 10.707C8.83248 10.6651 8.92374 10.5841 8.9824 10.4835L10.192 10.6707C10.3084 10.6874 10.4211 10.625 10.4676 10.518L11.2321 8.75245C12.0972 8.9601 15.3731 9.70039 17.9403 9.69108C18.7356 9.68921 19.3958 9.61193 19.907 9.46201L20.3921 10.6325C20.4322 10.7312 20.5281 10.7927 20.6296 10.7917C20.651 10.7917 20.6761 10.788 20.6985 10.7824L22.1073 10.3867C22.1632 10.5105 22.2666 10.612 22.3988 10.6614L22.4184 10.6679C22.6279 10.7722 22.6968 11.2294 22.4761 11.6838C22.423 11.7937 22.3681 11.9324 22.3066 12.0795C22.221 12.2928 22.045 12.7267 21.9379 12.8431C21.8215 12.9102 21.733 13.021 21.6976 13.1523C20.7767 16.484 18.2709 18.8166 15.6087 18.8259C12.9325 18.8343 10.3922 16.5185 9.43216 13.1942C9.39398 13.0629 9.30738 12.9539 9.18912 12.8878C9.0811 12.7714 8.89859 12.3347 8.81013 12.1205C8.75054 11.9762 8.6928 11.8384 8.6388 11.7304C8.42183 11.2778 8.48701 10.8206 8.69746 10.7154Z" fill="white" />
                                </svg>

                            </div>
                            <div className="card-data-wrap">

                                <h5 className="mb-0 fw-bold">15</h5>
                                <small>Total Task</small>
                            </div>
                        </div>
                    </div>


                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">
                                <svg width="31" height="35" viewBox="0 0 31 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.4481 2.27808C14.1496 2.27808 15.5244 3.65285 15.5244 5.3543C15.5244 7.05576 14.1496 8.43053 12.4481 8.43053C10.7467 8.43053 9.37192 7.05576 9.37192 5.3543C9.37192 3.65285 10.7467 2.27808 12.4481 2.27808ZM28.7821 16.0258L25.2567 6.78352H25.2431L27.0806 0.481346L25.665 0.072998L22.0307 12.5276L23.4463 12.936L24.5625 9.08389L26.8901 15.0866H23.4463V16.0258H19.9209C19.9209 16.0122 19.9209 15.9986 19.9209 15.985C19.9209 15.073 19.2539 14.2835 18.342 14.2835H12.6795C12.6795 14.2835 11.087 9.87336 10.5153 8.92055C10.0661 8.18552 9.37192 7.72273 8.45994 7.72273C7.05794 7.72273 5.99624 8.87971 5.23399 10.5539C3.96811 13.3307 3.42364 16.7472 3.73671 19.8915C3.88644 21.171 4.1995 22.2463 4.94814 22.8588H2.42999V12.9496H0.292969V34.3743H2.42999V24.9959H12.5843L11.1686 32.0195C10.9509 33.0812 11.6451 34.1156 12.7068 34.3334C12.8429 34.3607 12.9654 34.3743 13.1015 34.3743C14.0135 34.3743 14.8302 33.7345 15.0207 32.7953L16.2186 26.847L17.7431 30.9441C18.0425 31.7336 18.7912 32.2236 19.5806 32.2236C19.812 32.2236 20.0434 32.1828 20.2612 32.1011C21.2821 31.72 21.7857 30.5902 21.4182 29.583L18.097 20.6674C17.8111 19.9051 17.0761 19.3879 16.2594 19.3879H11.0053V18.1492H28.1559V34.3743H30.293V16.0258H28.7821Z" fill="white" />
                                </svg>

                            </div>
                            <div className="card-data-wrap">

                                <h5 className="mb-0 fw-bold">6</h5>
                                <small>Completed Task</small>
                            </div>
                        </div>
                    </div>


                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">
                                <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.87756 0.549496C2.43822 0.110141 1.7259 0.110126 1.28656 0.549466C0.847202 0.988806 0.847187 1.70113 1.28653 2.14047L10.0688 10.9229C9.12209 11.3194 8.45704 12.2546 8.45704 13.3451V15.2201H10.7071V13.3451L10.717 13.2592C10.7558 13.0936 10.9045 12.9701 11.0821 12.9701H12.116L15.8616 16.7158H3.58062C2.51732 16.7158 2.04749 18.0547 2.87759 18.7192L9.95706 24.3858V26.8522C9.95706 28.7162 11.4681 30.2272 13.332 30.2272H18.5752C20.4392 30.2272 21.9502 28.7162 21.9502 26.8522V24.3857L22.8283 23.6826L29.0364 29.8911C29.4758 30.3304 30.1882 30.3304 30.6275 29.8911C31.0669 29.4517 31.0669 28.7393 30.6275 28.3L2.87756 0.549496ZM21.2275 22.082L20.122 22.9671C19.8554 23.1806 19.7002 23.5037 19.7002 23.8452V26.8522C19.7002 27.4735 19.1965 27.9772 18.5752 27.9772H13.332C12.7108 27.9772 12.2071 27.4735 12.2071 26.8522V23.8452C12.2071 23.5037 12.0518 23.1804 11.7851 22.967L6.78643 18.9658H18.1115L21.2275 22.082Z" fill="white" />
                                    <path d="M15.957 9.2208C15.4412 9.2208 14.9455 9.134 14.4841 8.97419L11.7036 6.19368C11.5438 5.73217 11.457 5.23659 11.457 4.72075C11.457 2.23544 13.4718 0.220703 15.957 0.220703C18.4424 0.220703 20.4571 2.23544 20.4571 4.72075C20.4571 7.20606 18.4424 9.2208 15.957 9.2208ZM15.957 2.47073C14.7144 2.47073 13.707 3.4781 13.707 4.72075C13.707 5.9634 14.7144 6.97078 15.957 6.97078C17.1998 6.97078 18.207 5.9634 18.207 4.72075C18.207 3.4781 17.1998 2.47073 15.957 2.47073Z" fill="white" />
                                    <path d="M28.3249 16.7158H22.2266L26.3633 20.8527L29.0281 18.7191C29.858 18.0544 29.3881 16.7158 28.3249 16.7158Z" fill="white" />
                                    <path d="M18.4803 12.9701L16.2305 10.7201H20.8247C22.2019 10.7201 23.3314 11.7808 23.441 13.1298L23.4497 13.3451V15.2201H21.1997V13.3451C21.1997 13.1676 21.0763 13.0188 20.9107 12.98L20.8247 12.9701H18.4803Z" fill="white" />
                                </svg>

                            </div>
                            <div className="card-data-wrap">

                                <h5 className="mb-0 fw-bold">0</h5>
                                <small>Over Due Task</small>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">
                                <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.375 13.7236C26.9314 13.7236 30.625 17.4172 30.625 21.9736C30.625 26.53 26.9314 30.2236 22.375 30.2236C17.8186 30.2236 14.125 26.53 14.125 21.9736C14.125 17.4172 17.8186 13.7236 22.375 13.7236ZM22.375 25.5361C21.8572 25.5361 21.4375 25.9558 21.4375 26.4736C21.4375 26.9914 21.8572 27.4111 22.375 27.4111C22.8928 27.4111 23.3125 26.9914 23.3125 26.4736C23.3125 25.9558 22.8928 25.5361 22.375 25.5361ZM22.75 0.223633C25.4424 0.223633 27.625 2.40624 27.625 5.09863V13.7563C26.9302 13.3116 26.1752 12.9523 25.375 12.6939V8.47363H2.875V22.3486C2.875 23.7984 4.05025 24.9736 5.5 24.9736H13.0953C13.3537 25.7739 13.7129 26.5288 14.1577 27.2236H5.5C2.80761 27.2236 0.625 25.041 0.625 22.3486V5.09863C0.625 2.40624 2.80761 0.223633 5.5 0.223633H22.75ZM22.375 16.7236C21.9608 16.7236 21.625 17.0595 21.625 17.4736V23.4736C21.625 23.8878 21.9608 24.2236 22.375 24.2236C22.7892 24.2236 23.125 23.8878 23.125 23.4736V17.4736C23.125 17.0595 22.7892 16.7236 22.375 16.7236ZM22.75 2.47363H5.5C4.05025 2.47363 2.875 3.64888 2.875 5.09863V6.22363H25.375V5.09863C25.375 3.64888 24.1998 2.47363 22.75 2.47363Z" fill="white" />
                                </svg>

                            </div>
                            <div className="card-data-wrap">

                                <h5 className="mb-0 fw-bold">9</h5>
                                <small>Pending Task</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-fluid pb-5 px-0">
               

                <div className="row col-lg-12">
                    {/* Table Preview */}

        <div className="">
          <h4>Tasks Preview</h4>
             <div className="table-responsive g-table-wrap g-t-scroll">
          <table className="table g-table">
            <thead>
              <tr>
             
                <th>Title</th>
                <th>Task Id</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
             
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={idx}>
                  <td>{t.title}</td>
                  <td>{t.taskId}</td>
                  <td>{t.dueDate}</td>
                  <td>{t.priority}</td>
                  <td>{t.status}</td>
                  <td>{t.assignee}</td>
              
                </tr>
              ))}
            </tbody>
          </table>

             </div>
        </div>
  

                </div>
            </div>

  
            <style jsx>{`
       .stat-card {
      border: none;
    border-radius: 1.5rem;
    flex-direction: row;
    justify-content: space-between;
    align-items:center;
    transition: transform .3s;
    display: flex;
    padding: 40px 20px !important;
  }

  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }

  .icon-circle {
    color: #8e44ad;
    background-color: #b980ff;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
 
  }

  .text-purple {
    color: #8e44ad;
  }


  .card-data-wrap h5 {
    font-size: 24px;
    font-weight: 500;
    text-align: end;
    margin-bottom: 14px !important;
}

.card-data-wrap small {
   font-size: 18px;
    font-weight: 500;
}
      `}</style>
        </>
    )
}
