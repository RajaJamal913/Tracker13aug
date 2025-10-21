// filter multiselect 

'use client';

import React, { useState } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
type Option = { name: string };

export default function FilterMultiSelects() {
  const [selectedMembers, setSelectedMembers] = useState<Option[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Option[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Option[]>([]);
 
  // build change 
//  const [selectedDate, setSelectedDate] = useState(null);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const members = ['Jamal', 'Amrad', 'Huzaifa'].map((name) => ({ name }));
  const projects = [
    'Web Designing',
    'Real-Time Chat Application UI',
    'App Development',
  ].map((name) => ({ name }));
  const teams = [
    'Development Team',
    'Project Management',
    'Designing Team',
  ].map((name) => ({ name }));
  const titles = [
    'Full-stack Developer',
    'Back-end Developer',
    'Front-end Developer',
  ].map((name) => ({ name }));

  return (
    <div className="filter-wrapper">
      <MultiSelect
        value={selectedMembers}
        options={members}
        onChange={(e) => setSelectedMembers(e.value)}
        optionLabel="name"
        placeholder="Members"
        // build change 
        // display="checkbox"
         display="chip" 
        filter
        className="filter-dropdown"
        
      />

      <MultiSelect
        value={selectedProjects}
        options={projects}
        onChange={(e) => setSelectedProjects(e.value)}
        optionLabel="name"
        placeholder="Projects"
        // build change 
        // display="checkbox"
         display="chip" 
        filter
        className="filter-dropdown"
      />

      <MultiSelect
        value={selectedTeams}
        options={teams}
        onChange={(e) => setSelectedTeams(e.value)}
        optionLabel="name"
        placeholder="Teams"
        // build change 
        // display="checkbox"
         display="chip" 
        filter
        className="filter-dropdown"
      />

     
 <DatePicker 

        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
        dateFormat="MMMM d, yyyy"
        placeholderText="Choose a date"
        className="form-control custom-datepicker"
      />
      <style jsx>{`
        .filter-wrapper {
          display: flex;
          gap: 1rem;
          padding: 1rem 0px;
          flex-wrap: wrap;
        }

        .filter-dropdown {
          min-width: 220px;
        }

        :global(.p-multiselect-label) {
          font-size: 0.9rem;
        }

        :global(.p-multiselect-panel) {
          padding: 0.5rem;
        }
      `}</style>
    </div>
  );
}
