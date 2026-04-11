import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export function AddDeviceForm({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* 遮罩 */}
      {createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="inset-0 bg-black/50 fixed backdrop-blur-sm z-5"
          onClick={onClose}
        />,
        document.body,
      )}

      {/* 表单容器 */}
      {createPortal(
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed inset-x-4 inset-y-30 flex items-center justify-center z-10 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-lg p-6"
        ></motion.div>,
        document.body,
      )}
    </>
  );
}
