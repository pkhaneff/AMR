const AMRLogger = require('../utils/AMRLogger');

class UTurnStrategy {
    /**
     * Kiểm tra xem có nên quay đầu 180° không
     * @param {Object} graph - Graph chứa nodes
     * @param {string} currentNodeId - Node hiện tại
     * @param {string} targetNodeId - Node đích
     * @param {number} currentAngle - Góc hiện tại của AMR (0-360)
     * @returns {Object|null} - {shouldUTurn: true, direction: 'backward'} hoặc null
     */
    shouldUTurn(graph, currentNodeId, targetNodeId, currentAngle = 0) {
        try {
            const currentNode = graph.getNode(currentNodeId);
            const targetNode = graph.getNode(targetNodeId);

            if (!currentNode || !targetNode) {
                return null;
            }

            // Kiểm tra target có phải là neighbor trực tiếp không
            const isDirectNeighbor = currentNode.neighbors.some(n => n.nodeId === targetNodeId);

            if (!isDirectNeighbor) {
                return null;
            }

            // Tính góc từ current đến target
            const dx = targetNode.x - currentNode.x;
            const dy = targetNode.y - currentNode.y;
            const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Chuẩn hóa góc về 0-360
            const normalizedTargetAngle = (targetAngle + 360) % 360;
            const normalizedCurrentAngle = (currentAngle + 360) % 360;

            // Tính độ chênh lệch góc
            let angleDiff = Math.abs(normalizedTargetAngle - normalizedCurrentAngle);
            if (angleDiff > 180) {
                angleDiff = 360 - angleDiff;
            }

            // Nếu góc chênh lệch gần 180° (±30°), nên quay đầu
            if (angleDiff >= 150 && angleDiff <= 210) {
                AMRLogger.debug('UTurnStrategy', 'U-Turn recommended', {
                    currentNodeId,
                    targetNodeId,
                    currentAngle: normalizedCurrentAngle,
                    targetAngle: normalizedTargetAngle,
                    angleDiff,
                });

                return {
                    shouldUTurn: true,
                    direction: 'backward',
                    angleDiff,
                };
            }

            return null;
        } catch (error) {
            AMRLogger.error('UTurnStrategy', 'Failed to check U-Turn', error);
            return null;
        }
    }

    /**
     * Tạo path quay đầu đơn giản
     * @param {string} currentNodeId - Node hiện tại
     * @param {string} targetNodeId - Node đích
     * @returns {Array} - Path chỉ có 2 nodes
     */
    createUTurnPath(currentNodeId, targetNodeId) {
        return [currentNodeId, targetNodeId];
    }
}

module.exports = new UTurnStrategy();
