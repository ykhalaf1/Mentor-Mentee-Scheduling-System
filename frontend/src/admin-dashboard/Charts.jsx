import { useTheme, Box, Typography } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import { tokens } from "./theme";
import {
  mockBarData as barData,
  mockPieData as pieData,
  mockLineData as lineData,
} from "./mockData";

const Charts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        backgroundColor: "#E8F0FA",  
        minHeight: "100vh",
        color: "black",
        p: 2,
        "& *": { backgroundColor: "#E8F0FA", color: "black" }, 
      }}
    >
      <Box display="flex" flexWrap="wrap" gap={4} justifyContent="center">
        {/* Bar Chart */}
        <Box
          sx={{
            width: "500px",
            height: "300px",
            borderRadius: "12px",
            padding: "10px",
          }}
        >
          <Typography
            variant="h6"
            textAlign="center"
            fontWeight="bold"
            color="black"
          >
            Bar Chart
          </Typography>
          <ResponsiveBar
            data={barData}
            keys={["hot dog", "burger", "fries", "kebab", "sandwich", "donut"]}
            indexBy="country"
            enableLabel={false}
            colors={{ scheme: "nivo" }}
            margin={{ top: 40, right: 130, bottom: 50, left: 60 }}
            axisBottom={{ legend: "Mentors", legendOffset: 32 }}
            axisLeft={{ legend: "Meetings", legendOffset: -40 }}
            legends={[
              {
                dataFrom: "keys",
                anchor: "bottom-right",
                direction: "column",
                translateX: 120,
                itemsSpacing: 3,
                itemWidth: 100,
                itemHeight: 16,
              },
            ]}
            tooltip={({ id, value, indexValue }) => (
              <div
                style={{
                  padding: "5px 10px",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  color: "black",
                }}
              >
                <strong>{id}</strong> ({indexValue}): {value}
              </div>
            )}
          />
        </Box>

        {/* Pie Chart */}
        <Box
          sx={{
            width: "400px",
            height: "300px",
            borderRadius: "12px",
            padding: "10px",
          }}
        >
          <Typography
            variant="h6"
            textAlign="center"
            fontWeight="bold"
            color="black"
          >
            Pie Chart
          </Typography>
          <ResponsivePie
            data={pieData}
            margin={{ top: 30, right: 60, bottom: 60, left: 60 }}
            innerRadius={0.5}
            padAngle={0.6}
            cornerRadius={2}
            activeOuterRadiusOffset={8}
            enableArcLinkLabels={false}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                translateY: 40,
                itemWidth: 100,
                itemHeight: 18,
                symbolShape: "circle",
              },
            ]}
            tooltip={({ datum }) => (
              <div
                style={{
                  padding: "5px 10px",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  color: "black",
                }}
              >
                <strong>{datum.id}</strong>: {datum.value}
              </div>
            )}
          />
        </Box>

        {/* Line Chart */}
        <Box
          sx={{
            width: "600px",
            height: "350px",
            borderRadius: "12px",
            padding: "10px",
          }}
        >
          <Typography
            variant="h6"
            textAlign="center"
            fontWeight="bold"
            color="black"
          >
            Line Chart
          </Typography>
          <ResponsiveLine
            data={lineData}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            yScale={{
              type: "linear",
              min: "auto",
              max: "auto",
              stacked: true,
              reverse: false,
            }}
            axisBottom={{ legend: "transportation", legendOffset: 36 }}
            axisLeft={{ legend: "count", legendOffset: -40 }}
            enableGridX={false}
            pointSize={10}
            pointColor={{ theme: "background" }}
            pointBorderWidth={2}
            pointBorderColor={{ from: "seriesColor" }}
            pointLabelYOffset={-12}
            enableCrosshair={false}
            useMesh={true}
            legends={[
              {
                anchor: "bottom-right",
                direction: "column",
                translateX: 100,
                itemWidth: 80,
                itemHeight: 22,
                symbolShape: "circle",
              },
            ]}
            tooltip={({ point }) => (
              <div
                style={{
                  padding: "5px 10px",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  color: "black",
                }}
              >
                <strong>{point.serieId}</strong>
                <br />
                x: {point.data.xFormatted}, y: {point.data.yFormatted}
              </div>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Charts;
