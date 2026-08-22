import { NavLink, useNavigate } from "react-router-dom";
import logo from "/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faUserGraduate,
  faMoneyBillWave,
  faReceipt,
  faChartBar,
  faGraduationCap,
  faShieldHalved,
  faChevronLeft,
  faChevronRight,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector, useAuth } from "../hooks";
import { logout } from "../store/slices/authSlice";
import { toggleSidebar, selectSidebarCollapsed } from "../store/slices/uiSlice";
import { ROUTES } from "../utils/constants";
import { Avatar } from "../components/ui/Badge";

// Fee Config and Settings are tabs inside Academic (Admin role) and Admin page.
// Receptionist does NOT see Admin page.
const NAV_ITEMS = [
  {
    to: ROUTES.DASHBOARD,
    icon: faGaugeHigh,
    label: "Dashboard",
    roles: ["Admin", "Receptionist"],
  },
  {
    to: ROUTES.STUDENTS,
    icon: faUserGraduate,
    label: "Students",
    roles: ["Admin", "Receptionist"],
  },
  {
    to: ROUTES.PAYMENTS,
    icon: faMoneyBillWave,
    label: "Payments",
    roles: ["Admin", "Receptionist"],
  },
  {
    to: ROUTES.EXPENSES,
    icon: faReceipt,
    label: "Expenses",
    roles: ["Admin", "Receptionist"],
  },
  {
    to: ROUTES.REPORTS,
    icon: faChartBar,
    label: "Reports",
    roles: ["Admin", "Receptionist"],
  },
  {
    to: ROUTES.ACADEMIC,
    icon: faGraduationCap,
    label: "Academic",
    roles: ["Admin"],
  },
  { to: ROUTES.ADMIN, icon: faShieldHalved, label: "Admin", roles: ["Admin"] },
].filter((item) => !!item.to);

export default function Sidebar() {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  };

  const visibleItems = NAV_ITEMS.filter((n) => n.roles.includes(role));

  return (
    <aside
      className={[
        "h-screen flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 flex-shrink-0 z-30",
        collapsed ? "w-16" : "w-60",
      ].join(" ")}
    >
      {/* ── Logo / header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/60 h-16">
        {collapsed ? (
          <img
            src={logo}
            alt="Rock Out College"
            className="w-8 h-8 object-contain mx-auto"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logo}
              alt="Rock Out College"
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <span className="font-bold text-white text-sm leading-tight truncate">
              Rock Out
              <br />
              <span className="text-blue-300 font-semibold text-xs">
                School Fees
              </span>
            </span>
          </div>
        )}

        {/* Collapse / expand toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FontAwesomeIcon
            icon={collapsed ? faChevronRight : faChevronLeft}
            className="text-xs"
          />
        </button>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {visibleItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.DASHBOARD}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-slate-700/60 text-slate-400 hover:text-white",
                collapsed ? "justify-center" : "",
              ].join(" ")
            }
            title={collapsed ? label : undefined}
          >
            <FontAwesomeIcon
              icon={icon}
              className="w-4 text-center flex-shrink-0"
            />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-700/60 p-3">
        <NavLink
          to={ROUTES.PROFILE}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/60 transition-colors mb-1"
        >
          <Avatar
            name={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
            size="sm"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className={[
            "flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-xs text-slate-400",
            "hover:bg-red-900/40 hover:text-red-400 transition-colors",
            collapsed ? "justify-center" : "",
          ].join(" ")}
          title={collapsed ? "Logout" : undefined}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
