'use client';
// This tells Next JS to never statically prerender this route
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'react-feather';

// Define TypeScript types

type ColumnKeys =
  | 'Project Member'
  | 'Members'
  | 'Hours Spent'
  | 'Active Tasks'
  | 'Notes'
  | 'Actions'
  | 'Estimate Hours'
  | 'Budget Estimate';
type ColumnsState = Record<ColumnKeys, boolean>;

interface ColumnSelectorProps {
  columns: ColumnsState;
  setColumns: React.Dispatch<React.SetStateAction<ColumnsState>>;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, setColumns }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const allKeys = useMemo(() => Object.keys(columns) as ColumnKeys[], [columns]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleColumn = (column: ColumnKeys) => {
    setColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  return (
    <div ref={containerRef} className="relative py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="px-4 py-2 bg-white shadow rounded-md flex items-center border border-gray-300"
      >
        Columns
        <ChevronDown size={16} className="ml-2" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Select columns"
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10"
        >
          {allKeys.map(key => (
            <label
              key={key}
              role="menuitemcheckbox"
              aria-checked={columns[key]}
              className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded"
            >
              <input
                type="checkbox"
                checked={columns[key]}
                onChange={() => toggleColumn(key)}
                className="mr-2"
              />
              {key}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectTable: React.FC = () => {
  const [columns, setColumns] = useState<ColumnsState>({
    'Project Member': true,
    Members: true,
    'Hours Spent': true,
    'Active Tasks': true,
    Notes: true,
    Actions: true,
    'Estimate Hours': true,
    'Budget Estimate': true,
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ColumnSelector columns={columns} setColumns={setColumns} />
      </div>

      <div className="overflow-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="text-center align-middle">
              {columns['Project Member'] && <th className="px-4 py-2">Project Member</th>}
              {columns['Members'] && <th className="px-4 py-2">Members</th>}
              {columns['Hours Spent'] && <th className="px-4 py-2">Hours Spent</th>}
              {columns['Active Tasks'] && <th className="px-4 py-2">Active Tasks</th>}
              {columns['Notes'] && <th className="px-4 py-2">Notes</th>}
              {columns['Actions'] && <th className="px-4 py-2">Actions</th>}
              {columns['Estimate Hours'] && <th className="px-4 py-2">Estimate Hours</th>}
              {columns['Budget Estimate'] && <th className="px-4 py-2">Budget Estimate</th>}
            </tr>
          </thead>
          <tbody>
            <tr className="text-center align-middle">
              {columns['Project Member'] && <td className="px-4 py-2">John Doe</td>}
              {columns['Members'] && <td className="px-4 py-2">4</td>}
              {columns['Hours Spent'] && <td className="px-4 py-2">90</td>}
              {columns['Active Tasks'] && <td className="px-4 py-2">5</td>}
              {columns['Notes'] && <td className="px-4 py-2">No Data</td>}
              {columns['Actions'] && <td className="px-4 py-2">...</td>}
              {columns['Estimate Hours'] && <td className="px-4 py-2">100</td>}
              {columns['Budget Estimate'] && <td className="px-4 py-2">$5,000</td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectTable;
