import HeaderBar from "../ERP/HeaderBar";
import TopNav from "../TopNav";

function AppLayout({ children }) {
  return (
    <div className="erp-container no-print-layout">
      <HeaderBar />

      <TopNav />

      <div className="page-content">
        {children}
      </div>
    </div>
  );
}

export default AppLayout;