"use client";
import Image from "next/image";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone"; 
import { Card } from "react-bootstrap";
import { Legend } from "recharts";
import { useState } from "react";
import { Table, Form } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
export default function Home() {





const data2 = [
    { name: 'Mon', value: 2, fill: '#F4B740' },    // Yellow
    { name: 'Tue', value: 8, fill: '#00A86B' },    // Green
    { name: 'Wed', value: 6, fill: '#E2C5FF' },    // Light Purple
    { name: 'Thu', value: 4, fill: '#FF4B4B' },    // Red
    { name: 'Fri', value: 3, fill: '#E9815A' },    // Coral
    { name: 'Sat', value: 5, fill: '#5E2D92' },    // Dark Purple
    { name: 'Sun', value: 6, fill: '#FFB946' },    // Orange
  ];




  return (<>
   <div>
    <h1>ammad</h1>
   </div>
  
  </>


  );
}
