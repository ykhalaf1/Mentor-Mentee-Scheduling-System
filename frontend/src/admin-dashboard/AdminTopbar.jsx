import { Box, IconButton } from "@mui/material"; // removed useTheme
import { useContext } from "react";
import { ColorModeContext, tokens } from "./theme";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";

const Topbar = () => {
  const colorMode = useContext(ColorModeContext);

  return (
    <Box display="flex" p={2} sx={{ backgroundColor: "#E8F0FA" }}>
      {/* ICONS */}
      <Box display="flex" ml="auto">
        <IconButton>
          <NotificationsOutlinedIcon />
        </IconButton>
        <IconButton>
          <PersonOutlinedIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
