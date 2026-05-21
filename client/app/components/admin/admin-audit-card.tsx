"use client";

import React from "react";
import { IoListOutline } from "react-icons/io5";
import { useLanguage } from "@/app/context/language-provider";

const AdminAuditCard = () => {
  const { language } = useLanguage();
  const copy =
    language === "vi"
      ? {
          sectionLabel: "Audit",
          title: "Hành động gần đây",
          description:
            "Chức năng ghi nhật ký (audit writes) hiện có sẵn cho các thay đổi cờ tính năng, nhưng điểm cuối đọc (read endpoint) và nguồn cấp dữ liệu hoạt động (activity feed) vẫn chưa được triển khai.",
          badge: "Đọc API đang chờ xử lý",
        }
      : {
          sectionLabel: "Audit",
          title: "Recent Actions",
          description:
            "Audit writes exist for feature flag changes, but a read endpoint and activity feed are not implemented yet.",
          badge: "Read API pending",
        };

  return (
    <section className="admin-card placeholder-card audit-card">
      <div className="placeholder-icon">
        <IoListOutline />
      </div>
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h2>{copy.title}</h2>
      </div>
      <p className="admin-card-copy">{copy.description}</p>
      <span className="placeholder-badge">{copy.badge}</span>
    </section>
  );
};

export default AdminAuditCard;
