import { Box, Typography, useTheme, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "./theme";
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

const Mentors = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mentors"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "N/A",
        email: doc.data().email || "N/A",
        university: doc.data().university || "N/A",
        industry: doc.data().industry || "N/A",
        major: doc.data().major || "N/A",
        skills: doc.data().skills || "N/A",
      }));
      setMentors(data);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    const mentor = mentors.find((m) => m.id === id);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete mentor '${mentor.name}'?`
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "mentors", id));
      setMentors((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error deleting mentor:", error);
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "university",
      headerName: "University",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "industry",
      headerName: "Industry",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "major",
      headerName: "Major",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "skills",
      headerName: "Skills",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
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
        "& .MuiDataGrid-root": {
          border: "none",
          backgroundColor: "#E8F0FA",
          color: "black",
        },
        "& .MuiDataGrid-cell": {
          borderBottom: "none",
          fontWeight: "bold",
          color: "black",
        },
        "& .MuiDataGrid-columnHeaders": {
          borderBottom: "none",
          backgroundColor: "#E8F0FA",
          color: "black",
          fontWeight: "bold",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: "bold",
          color: "black",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "none",
          backgroundColor: "#E8F0FA",
          color: "black",
        },
        "& .fc": {
          backgroundColor: "#E8F0FA",
          "--fc-page-bg-color": "#E8F0FA",
        },
      }}
    >
      <Header
        title="Mentors"
        subtitle={
          <span style={{ color: "#03527C" }}>Ummah Professionals Mentors</span>
        }
      ></Header>
      <Box m="40px 0 0 0" height="75vh">
        <DataGrid rows={mentors} columns={columns} />
      </Box>
    </Box>
  );
};

export default Mentors;
