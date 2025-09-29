import { Box, Typography, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import Header from "./Header";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import app from "../firebase";
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";

const db = getFirestore(app);

const Mentees = () => {
  const [mentees, setMentees] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mentees"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        firstName: doc.data().firstName || "N/A",
        lastName: doc.data().lastName || "N/A",
        major: doc.data().major || "N/A",
        phone: doc.data().phone || "N/A",
      }));
      setMentees(data);
    });

    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    const mentee = mentees.find((m) => m.id === id);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete mentee '${mentee.firstName} ${mentee.lastName}'?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "mentees", id));
      setMentees((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error deleting mentee:", error);
    }
  };

  const columns = [
    { field: "firstName", headerName: "First Name", flex: 1, headerAlign: "center", align: "center" },
    { field: "lastName", headerName: "Last Name", flex: 1, headerAlign: "center", align: "center" },
    { field: "major", headerName: "Major", flex: 1, headerAlign: "center", align: "center" },
    { field: "phone", headerName: "Phone Number", flex: 1, headerAlign: "center", align: "center" },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#E8F0FA", 
        color: "black",
        px: 4,
        py: 4,
        "& .MuiDataGrid-root": { border: "none", backgroundColor: "#E8F0FA", color: "black" },
        "& .MuiDataGrid-cell": { borderBottom: "none", fontWeight: "bold", color: "black" },
        "& .MuiDataGrid-columnHeaders": { borderBottom: "none", backgroundColor: "#E8F0FA", color: "black", fontWeight: "bold" },
        "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold", color: "black" },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: "#E8F0FA", color: "black" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: "#E8F0FA", color: "black" },
        "& .fc": { "--fc-page-bg-color": "#E8F0FA" }, 
      }}
    >
          <Header 
        title="Mentees"  
        subtitle={<span style={{ color: "#03527C" }}>Ummah Professionals Mentees</span>} 
      />
      <Box m="40px 0 0 0" height="75vh">
        <DataGrid rows={mentees} columns={columns} />
      </Box>
    </Box>
  );
};

export default Mentees;
