// add teams oage 

'use client';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, Card, Col, Container, Row, Tab, Tabs } from 'react-bootstrap';

import 'primereact/resources/themes/lara-light-blue/theme.css'; // or another theme
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { MultiSelect } from 'primereact/multiselect';
// build add 
interface City {
  name: string;
  code: string;
}
export default function Home() {


// for MultiSelect selectbox 
// const [selectedCities, setSelectedCities] = useState([]);
// const [addedCities, setAddedCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);

  const [addedCities, setAddedCities] = useState<City[]>([]);




const handleAddCities = () => {
  // Prevent duplicates
  const newCities = selectedCities.filter(
      (city) => !addedCities.some((added) => added.code === city.code)
  );
  setAddedCities([...addedCities, ...newCities]);
  setSelectedCities([]); // Clear the selected cities
};

// build change 
// const handleRemoveCity = (code) => {
//   setAddedCities(addedCities.filter((city) => city.code !== code));
// };
  const handleRemoveCity = (code: string) => {
    setAddedCities(addedCities.filter((city) => city.code !== code));
  };


const handleClearAll = () => {
  setAddedCities([]);
};

const cities = [
    { name: 'Hamza', code: 'DT' },
    { name: 'Usman', code: 'PM' },
    { name: 'Hina', code: 'QA' }
    
];


const [selectedProject, setSelectedProject] = useState([]);

const projects = [
    { name: 'Getting Started with WewWizTracker', code: 'DT' }
   
    
];
// for MultiSelect selectbox 

  return (
    <div className="py-5 container">
        <div className="card flex flex-col gap-4 items-start w-full max-w-md p-4">
            <MultiSelect
                value={selectedCities}
                options={cities}
                onChange={(e) => setSelectedCities(e.value)}
                optionLabel="name"
                placeholder="Select members to add in team"
                filter
                display="chip"
                className="w-full"
            />
          
            <button type="button" onClick={handleAddCities} className="btn g-btn">Add</button>
            {addedCities.length > 0 && (
                <div className="mt-4 w-full">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <h4>Added Teams:</h4>
                       
                        <button type="button" onClick={handleClearAll} className="btn g-btn">Remove All</button>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                        {addedCities.map((city) => (
                            <li key={city.code} className="flex justify-between items-center">
                              <div className="teams-wrap">
                              <span className='pv-teams'>{city.name}</span>
                              </div>
                                
                                
                                <button type="button" onClick={() => handleRemoveCity(city.code)} className="btn g-btn">Remove</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      
    </div>
  );
}
