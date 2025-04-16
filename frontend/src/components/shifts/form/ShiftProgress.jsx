import React from "react";
import { Progress, Space, Typography } from "antd";

const { Text } = Typography;

const ShiftProgress = ({ totalPercentage }) => (
  <Space direction="vertical" align="center" style={{ width: "100%" }}>
    <Progress
      type="dashboard"
      percent={totalPercentage}
      strokeColor={totalPercentage > 100 ? "#ff4d4f" : "#52c41a"}
      size={200}
      format={(percent) => (
        <div style={{ textAlign: "center" }}>
          <Text strong style={{ fontSize: 24 }}>
            {percent}%
          </Text>
          <br />
          <Text type="secondary">Загальне навантаження</Text>
        </div>
      )}
    />
  </Space>
);

export default ShiftProgress;
