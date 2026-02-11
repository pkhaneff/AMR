/**
 * AMR API Configuration
 * Simulator xử lý tất cả API codes trên cùng 1 PORT (19204 cho AMR001, 19205 cho AMR002...)
 */

const AMR_API_CONFIG = {
  STATUS_API: {
    PORT: 19204,
    ENDPOINTS: {
      ROBOT_STATUS_LOC_REQ: 1004, // Lấy vị trí hiện tại
    },
  },

  CONTROL_API: {
    PORT: 19204,
    ENDPOINTS: {
      ROBOT_CONTROL_STOP_REQ: 2000, // Dừng robot
    },
  },

  NAVIGATION_API: {
    PORT: 19204,
    ENDPOINTS: {
      ROBOT_TASK_GOTARGET_REQ: 3051, // Đi đến điểm đích
      ROBOT_TASK_CANCEL_REQ: 3003, // Hủy nhiệm vụ
      ROBOT_TASK_PAUSE_REQ: 3001, // Tạm dừng
      ROBOT_TASK_RESUME_REQ: 3002, // Tiếp tục
    },
  },
};

function getApiConfig(apiName) {
  return AMR_API_CONFIG[apiName];
}

function getEndpointCode(apiName, endpointName) {
  const api = AMR_API_CONFIG[apiName];
  return api?.ENDPOINTS?.[endpointName];
}

module.exports = {
  AMR_API_CONFIG,
  getApiConfig,
  getEndpointCode,
};
