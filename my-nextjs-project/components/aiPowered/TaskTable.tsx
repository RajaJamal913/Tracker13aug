"use client"
import React from 'react';

const TaskTable = () => {
  // Static data matching your example with TypeScript interface
  interface TaskItem {
    taskName: string;
    assignedTo: string;
    delayCount: string;
    priority: string;
  }

  const tableData: TaskItem[] = [
    { taskName: 'Dev API Setup', assignedTo: 'Hamza', delayCount: '3 Times', priority: 'Red Flag' },
    { taskName: 'UX Mockup', assignedTo: 'Ammad', delayCount: '1 Times', priority: 'Warning' },
    { taskName: 'UX Mockup', assignedTo: 'Ammad', delayCount: '1 Times', priority: 'Warning' }
  ];

  // Function to determine badge color based on priority with proper typing
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'Red Flag':
        return 'danger';
      case 'Warning':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <>

      
        
          <div className="table-responsive g-table-wrapper gt-scroll ">
            <table className="table g-table g-shadow">
              <thead className="">
                <tr>
                  <th>Task Name</th>
                  <th>Assigned To</th>
                  <th>Delay Count</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.taskName}</td>
                    <td>{item.assignedTo}</td>
                    <td>{item.delayCount}</td>
                    <td>
                      <span className={`badge bg-${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    
      
      
      <style jsx>{`
     
        .badge {
          font-size: 0.85rem;
          padding: 0.35em 0.65em;
        }
      `}</style>
    </>
  );
};

export default TaskTable;