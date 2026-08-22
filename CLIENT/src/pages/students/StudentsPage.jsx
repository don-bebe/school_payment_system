import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTableCells, faUserGraduate, faUsers, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, usePermission } from '../../hooks';
import { searchStudents, selectStudentList, selectStudentPaging, selectStudentsLoading } from '../../store/slices/studentsSlice';
import { fetchGrades, selectGrades, fetchActiveYear, selectActiveYear } from '../../store/slices/academicSlice';
import { SectionHeader } from '../../components/ui/Card';
import Table, { Pagination } from '../../components/ui/Table';
import { SearchBar, FilterBar } from '../../components/ui/SearchBar';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

const GENDER_FILTER_OPTIONS = [
  { value: 'Male',   label: 'Male'   },
  { value: 'Female', label: 'Female' },
];

export default function StudentsPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const isAdmin    = usePermission(['Admin']);
  const students   = useAppSelector(selectStudentList);
  const paging     = useAppSelector(selectStudentPaging);
  const loading    = useAppSelector(selectStudentsLoading);
  const grades     = useAppSelector(selectGrades);
  const activeYear = useAppSelector(selectActiveYear);

  const [query,         setQuery]         = useState('');
  const [filters,       setFilters]       = useState({ gradeId: null, gender: null, academicYearId: null });
  const [showGraduated, setShowGraduated] = useState(false);
  const [page,          setPage]          = useState(1);

  const doSearch = useCallback(() => {
    dispatch(searchStudents({
      query:          query || undefined,
      gradeId:        filters.gradeId        || undefined,
      gender:         filters.gender         || undefined,
      academicYearId: filters.academicYearId || activeYear?.id || undefined,
      isActive:       showGraduated ? undefined : true,
      page,
      pageSize: 20,
    }));
  }, [dispatch, query, filters, showGraduated, page, activeYear]);

  useEffect(() => { dispatch(fetchGrades()); dispatch(fetchActiveYear()); }, [dispatch]);
  useEffect(() => { doSearch(); }, [doSearch]);

  const COLUMNS = [
    { key: 'studentNumber', label: 'Student #', sortable: true },
    { key: 'fullName',      label: 'Name',       sortable: true,
      render: r => (
        <span className="font-medium text-slate-800">
          {r.firstName && r.surname ? `${r.firstName} ${r.surname}` : r.fullName ?? '—'}
        </span>
      )},
    { key: 'gradeName',     label: 'Grade'                                          },
    { key: 'gender',        label: 'Gender',
      render: r => r.gender ? (
        <Badge variant={r.gender === 'Male' ? 'blue' : 'pink'}>{r.gender}</Badge>
      ) : '—'
    },
    { key: 'guardianName',  label: 'Guardian', render: r => r.guardianName  ?? '—' },
    { key: 'guardianPhone', label: 'Phone',    render: r => r.guardianPhone ?? '—' },
    { key: 'enrollmentDate', label: 'Enrolled', render: r => formatDate(r.enrollmentDate) },
    { key: 'isActive',      label: 'Status',   align: 'center',
      render: r => r.isGraduated
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
            🎓 Graduated
          </span>
        : <StatusBadge status={r.isActive ? 'Completed' : 'Reversed'} /> },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Students"
        subtitle={`${paging.total} ${showGraduated ? 'total' : 'active'} student${paging.total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={faTableCells}
              onClick={() => navigate('/students/grade-view')}>
              Grade View
            </Button>
            <Button size="sm" variant="secondary" icon={faUsers}
              onClick={() => navigate('/students/bulk-enrol')}>
              Bulk Enrol
            </Button>
            {isAdmin && (
              <Button size="sm" variant="secondary" icon={faGraduationCap}
                onClick={() => navigate(ROUTES.ALUMNI)}>
                Alumni
              </Button>
            )}
            <Button size="sm" icon={faPlus}
              onClick={() => navigate(ROUTES.NEW_STUDENT)}>
              Enrol Student
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar
          onSearch={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name or student number…"
        />
        <FilterBar
          filters={[
            { key: 'gradeId', label: 'All Grades',  options: grades.map(g => ({ value: g.id, label: g.name })) },
            { key: 'gender',  label: 'All Genders', options: GENDER_FILTER_OPTIONS },
          ]}
          values={filters}
          onChange={(k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); }}
        />
        <button
          onClick={() => { setShowGraduated(v => !v); setPage(1); }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            showGraduated
              ? 'bg-purple-100 border-purple-300 text-purple-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          🎓 {showGraduated ? 'Hiding' : 'Show'} graduated
        </button>
      </div>

      <Table
        columns={COLUMNS}
        data={students}
        loading={loading}
        onRowClick={(row) => navigate(ROUTES.STUDENT(row.id))}
        emptyMessage="No students found. Try adjusting your search."
        emptyIcon={faUserGraduate}
      />
      <Pagination
        page={page}
        totalPages={Math.ceil(paging.total / paging.pageSize)}
        totalCount={paging.total}
        pageSize={paging.pageSize}
        onPage={(p) => setPage(p)}
      />
    </div>
  );
}
