"use client";
export const dynamic = 'force-dynamic';

import WeeklyWorkingHoursChart from '@/components/weeklyworkingreport/page';
import TasksDonutChart from '@/components/reporting/TasksDonutChart/page';
import ProjectsDonutChart from '@/components/reporting/ProjectsDonutChart/page';
import SummaryCards from '@/components/reporting/SummaryCards/page';
import Attendance from '@/components/reporting/Attendance/page';
import TasksList from '@/components/reporting/TasksList/page';
import FilterMultiSelects from '@/components/FilterMultiSelects';

export default function Reporting() {
  return (
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">Reporting</h2>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <a href="/dashboard/tracked-hours" className="btn g-btn">Tracked Hours</a>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-lg-12">
          <FilterMultiSelects />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <WeeklyWorkingHoursChart />
        </div>
        <div className="col-lg-4 mb-4">
          <TasksDonutChart />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="row">
            <div className="col-lg-12">
              <SummaryCards />
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6 mb-4">
              <Attendance />
            </div>
            <div className="col-lg-6 mb-4">
              <TasksList />
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <ProjectsDonutChart />
        </div>
      </div>
    </div>
  );
}
