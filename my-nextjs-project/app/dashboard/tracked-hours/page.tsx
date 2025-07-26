"use client";
import { useState } from "react";
import { ChevronDown } from "react-feather";
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import FilterMultiSelects from '@/components/FilterMultiSelects';



const TimeRequestTabs = () =>  {
const trackedHours = [
  { Name: "Hamza", Project: "Law website design", Task: "Hamza", ActivityDesc: "NA", status: "In Progress" },
  { Name: "Jamal", Project: "CRM website design", Task: "Hamza", ActivityDesc: "NA", status: "Not Started" },

];

  return (
    <div className="container-fluid py-4">
      {/* Column Selector */}

<div className="page-title-wrapper d-flex align-items-center justify-content-between flex-wrap mb-4">
          <h2 className="page-heading-wrapper">Realtime Montoring</h2>
          <div className="d-flex align-items-center flex-wrap gap-2">
            {/* <TimeCount/> */}
            <div className="tracker-btn-wrapper">
              <button className="btn track-btn">
                <div className="track-txt">Start Break</div>
                <div className="icon-wrap">
                  <span className="icon-start">
                    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 10.8668C16.3333 10.097 16.3333 8.17251 15 7.40271L3.43799 0.727385C2.10465 -0.0424156 0.437988 0.919836 0.437988 2.45944V15.8101C0.437988 17.3497 2.10466 18.3119 3.43799 17.5421L15 10.8668Z" fill="url(#paint0_linear_29_15333)" />
                      <defs>
                        <linearGradient id="paint0_linear_29_15333" x1="13.9416" y1="-2.57324" x2="11.1833" y2="22.237" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                      </defs>
                    </svg>

                  </span>
                  <span className="icon-stop d-none">
                    <svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.8675 4.14029C10.1966 4.8114 9.83887 5.4825 9.83887 6.19839C9.83887 6.91427 10.1966 7.6301 10.8675 8.34598C10.957 8.43549 11.0464 8.48022 11.1806 8.48022C11.27 8.48022 11.4042 8.43549 11.4936 8.34598C11.6725 8.16703 11.6725 7.89856 11.4936 7.71961C11.0017 7.18273 10.7333 6.69053 10.7333 6.19839C10.7333 5.70624 11.0017 5.21409 11.4936 4.76667C12.1645 4.14029 12.5223 3.42441 12.5223 2.70858C12.5223 1.94797 12.2092 1.23213 11.4936 0.560977C11.3147 0.382018 11.0464 0.382018 10.8675 0.560977C10.6886 0.739935 10.6886 1.0084 10.8675 1.18736C11.3595 1.72423 11.6278 2.21643 11.6278 2.70858C11.6278 3.20072 11.3595 3.69287 10.8675 4.14029Z" fill="url(#paint0_linear_29_15335)" />
                      <path d="M14.7588 6.19839C14.7588 6.91427 15.1166 7.6301 15.7874 8.34598C15.8769 8.43549 15.9663 8.48022 16.1005 8.48022C16.19 8.48022 16.3241 8.43549 16.3688 8.34598C16.5477 8.16703 16.5477 7.89856 16.3688 7.71961C15.8769 7.18273 15.6086 6.69053 15.6086 6.19839C15.6086 5.70624 15.8769 5.21409 16.3688 4.76667C17.0844 4.14029 17.4422 3.42441 17.4422 2.70858C17.4422 1.94797 17.0844 1.23213 16.4136 0.560977C16.2347 0.382018 15.9663 0.382018 15.7874 0.560977C15.6086 0.739935 15.6086 1.0084 15.7874 1.18736C16.2794 1.72423 16.5477 2.21643 16.5477 2.70858C16.5477 3.20072 16.2794 3.64814 15.7874 4.14029C15.1166 4.8114 14.7588 5.4825 14.7588 6.19839Z" fill="url(#paint1_linear_29_15335)" />
                      <path d="M5.36621 6.19839C5.36621 6.91427 5.72398 7.6301 6.39486 8.34598C6.48432 8.43549 6.57374 8.48022 6.70792 8.48022C6.79738 8.48022 6.93151 8.43549 6.97627 8.34598C7.15515 8.16703 7.15515 7.89856 6.97627 7.71961C6.48432 7.18273 6.21597 6.69053 6.21597 6.19839C6.21597 5.70624 6.48432 5.21409 6.97627 4.76667C7.69185 4.14029 8.04962 3.42441 8.04962 2.70858C8.04962 1.94797 7.69185 1.23213 7.02097 0.560977C6.84209 0.382018 6.57374 0.382018 6.39486 0.560977C6.21597 0.739935 6.21597 1.0084 6.39486 1.18736C6.8868 1.72423 7.15515 2.21643 7.15515 2.70858C7.15515 3.20072 6.8868 3.64814 6.39486 4.14029C5.72403 4.8114 5.36621 5.4825 5.36621 6.19839Z" fill="url(#paint2_linear_29_15335)" />
                      <path d="M8.58603 21.4553C5.41073 20.9184 3.80067 19.1287 3.12984 15.5494C3.08514 15.3257 2.81678 15.1467 2.59319 15.1915C2.3696 15.2363 2.19067 15.5047 2.23542 15.7284C2.95096 19.7104 4.87403 21.7237 8.40715 22.3501C8.45185 22.3501 8.45185 22.3501 8.49661 22.3501C8.7202 22.3501 8.89914 22.2159 8.94385 21.9922C8.98856 21.7237 8.80962 21.5 8.58603 21.4553Z" fill="url(#paint3_linear_29_15335)" />
                      <path d="M23.0322 12.0491H22.3614C22.3614 11.8255 22.2719 11.6017 22.0931 11.4228C21.9142 11.2438 21.6905 11.1543 21.4669 11.1543H0.89447C0.670877 11.1543 0.447235 11.2438 0.268351 11.4228C0.0894666 11.6017 0 11.8255 0 12.0491C0.0393281 16.1027 0.598335 20.4329 4.11081 22.7871H1.3417C0.58141 22.7871 0 23.3687 0 24.1293C0 24.8899 0.58141 25.4716 1.3417 25.4716H7.15566C7.20037 25.4716 7.24513 25.4716 7.33455 25.4269L8.58678 25.0242H13.3274L14.6243 25.4269C14.669 25.4716 14.7138 25.4716 14.7585 25.4716H20.1252C20.8855 25.4716 21.4669 24.8899 21.4669 24.1293C21.4669 23.3687 20.8855 22.7871 20.1252 22.7871H18.2506C19.0429 22.2561 19.6849 21.6245 20.2046 20.9182C22.9593 20.4261 25 18.0164 25 15.181V14.0178C25.0001 12.944 24.1056 12.0491 23.0322 12.0491ZM17.4419 13.9283L18.3363 14.5099V17.4181H16.5474V14.5099L17.4419 13.9283ZM20.5725 24.1293C20.5725 24.3978 20.3936 24.5767 20.1253 24.5767H14.848L13.5063 24.174C13.4616 24.1293 13.4168 24.1293 13.3721 24.1293H8.45261C8.4079 24.1293 8.36314 24.174 8.31843 24.174L7.06619 24.5767H1.3417C1.07335 24.5767 0.89447 24.3978 0.89447 24.1293C0.89447 23.8608 1.07335 23.6819 1.3417 23.6819H5.90342H16.458H20.1252C20.3936 23.6819 20.5725 23.8609 20.5725 24.1293ZM16.3686 22.7871H5.94813C1.5653 20.9527 0.939179 16.5233 0.89447 12.0491H16.9947V13.1527L15.8319 13.9283C15.7424 14.0178 15.653 14.152 15.653 14.2862V17.8655C15.653 18.134 15.8319 18.3129 16.1003 18.3129H18.7836C19.0072 18.3129 19.2309 18.134 19.1861 17.8655V14.2862C19.1861 14.152 19.1414 14.0177 19.0073 13.9283L17.8892 13.1826V12.0491H21.4222C21.4222 12.3016 21.4199 12.5539 21.4151 12.8056C21.3524 15.1715 21.0433 18.0939 19.5439 20.2368C19.5172 20.2769 19.4994 20.3254 19.4886 20.3766C18.7507 21.3826 17.7419 22.2123 16.3686 22.7871ZM24.1503 15.181C24.1503 17.2839 22.8086 19.1183 20.9302 19.7894C22.0483 17.6418 22.3167 15.0916 22.3614 12.944H23.077C23.6584 12.944 24.1503 13.4361 24.1503 14.0178V15.181H24.1503Z" fill="url(#paint4_linear_29_15335)" />
                      <defs>
                        <linearGradient id="paint0_linear_29_15335" x1="12.5223" y1="1.82256" x2="9.6479" y2="1.92903" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                        <linearGradient id="paint1_linear_29_15335" x1="17.4422" y1="1.82256" x2="14.5678" y2="1.92903" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                        <linearGradient id="paint2_linear_29_15335" x1="8.04962" y1="1.82256" x2="5.17524" y2="1.92903" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                        <linearGradient id="paint3_linear_29_15335" x1="8.95074" y1="16.4265" x2="1.81782" y2="17.1704" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                        <linearGradient id="paint4_linear_29_15335" x1="25" y1="13.6357" x2="-0.842084" y2="18.6523" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#9A4AFD" />
                          <stop offset="0.541299" stop-color="#955ADD" />
                          <stop offset="1" stop-color="#6E34B5" />
                        </linearGradient>
                      </defs>
                    </svg>

                  </span>
                </div>

              </button>
            </div>
          </div>
        </div>




      <div className="d-flex justify-content-start mb-4">
        <FilterMultiSelects />
      </div>


      {/* Table */}
      <div className="table-responsive g-table-wrap g-t-scroll">
        <h1 className="table-heading">Tracked Hours Data</h1>
        <table className="w-full table g-table">
          <thead>
                  <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Project</th>
                    <th>Hour</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trackedHours.map((activity, index) => (
                    <tr key={index} style={{ backgroundColor: "#F7ECFF" }}>
                      <td>{activity.Name}</td>
                      <td>{activity.Project}</td>
                      <td>{activity.Task}</td>

                      <td>{activity.ActivityDesc}</td>
                      <td>{activity.status}</td>
                    </tr>
                  ))}
                </tbody>
        </table>

      </div>



    </div>

  );
};

export default TimeRequestTabs;
