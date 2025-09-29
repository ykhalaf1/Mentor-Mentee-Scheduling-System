import { useState } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { tokens } from "./theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { auth } from "../firebase";

const Item = ({ title, to, icon, selected, setSelected }) => {
  const navigate = useNavigate();
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: "black",
        backgroundColor: selected === title ? "#cce0f7" : "transparent",
        borderRadius: "6px",
      }}
      onClick={() => {
        setSelected(title);
        navigate(to);
      }}
      icon={icon}
    >
      <Typography sx={{ color: "black" }}>{title}</Typography>
    </MenuItem>
  );
};

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

  return (
    <Box
      sx={{
        height: "100vh", 
        "& .pro-sidebar-inner": {
          background: "#03527C !important",
          height: "100%", 
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
          color: "white !important",
        },
        "& .pro-inner-item": {
          padding: "10px 35px 10px 20px !important",
          color: "white !important",
        },
        "& .pro-inner-item:hover": {
          backgroundColor: "#024a66 !important", 
          color: "white !important",
          borderRadius: "6px",
        },
        "& .pro-menu-item.active": {
          backgroundColor: "#02688c !important",
          color: "white !important",
          borderRadius: "6px",
        },
      }}
    >
      <Sidebar collapsed={isCollapsed} height="100%">
        <Menu iconShape="square">
          {/* Logo */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 20px 0",
              color: "white",
            }}
          >
            {!isCollapsed && (
              <Box display="flex" justifyContent="flex-start" alignItems="center" ml="15px">
                <img
                  alt="logo"
                  src={"../UPLogo.svg"}
                  width="150px"
                  style={{ cursor: "pointer" }}
                />
              </Box>
            )}
          </MenuItem>

          {/* Profile */}
          {!isCollapsed && (
            <Box mb="25px" textAlign="center">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img
                  alt="profile-user"
                  width="80px"
                  height="80px"
                  src={"../user.jpg"}
                  style={{
                    cursor: "pointer",
                    borderRadius: "50%",
                    boxShadow: "0 0 5px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Box>
              <Box textAlign="center">
                <Typography variant="h6" color="black" fontWeight="bold" sx={{ m: "10px 0 0 0" }}>
                  {(auth.currentUser && auth.currentUser.displayName) || "User"}
                </Typography>
                <Typography variant="h6" sx={{ color: "#a3d2ff" }}>
                  UP Admin
                </Typography>
              </Box>
            </Box>
          )}

          {/* Menu Items */}
          <Box paddingLeft={isCollapsed ? undefined : "10%"} paddingRight={isCollapsed ? undefined : "10%"} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Item title="Dashboard" to="/admin-dashboard" icon={<HomeOutlinedIcon />} selected={selected} setSelected={setSelected} />
            <Item title="Mentor List" to="/admin-dashboard/mentors" icon={<PeopleOutlinedIcon />} selected={selected} setSelected={setSelected} />
            <Item title="Mentee List" to="/admin-dashboard/mentees" icon={<ContactsOutlinedIcon />} selected={selected} setSelected={setSelected} />
            <Item title="Calendar" to="/admin-dashboard/calendar" icon={<CalendarTodayOutlinedIcon />} selected={selected} setSelected={setSelected} />
            <Item title="Charts" to="/admin-dashboard/charts" icon={<BarChartOutlinedIcon />} selected={selected} setSelected={setSelected} />
          </Box>
        </Menu>
      </Sidebar>
    </Box>
  );
};

export default AdminSidebar;
