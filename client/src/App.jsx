import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("studenthub_token") || ""
  );

  const [editingId, setEditingId] = useState(null);

  const [adminEmail, setAdminEmail] = useState(
    () => sessionStorage.getItem("studenthub_admin") || ""
  );

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    rollNumber: "",
    course: "",
    year: "1",
  });

  function logout() {
    sessionStorage.removeItem("studenthub_token");
    sessionStorage.removeItem("studenthub_admin");

    setToken("");
    setAdminEmail("");
    setStudents([]);
    setError("");
    setLoginError("");
    setEditingId(null);
  }

  const loadStudents = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        logout();
        setLoginError("Your session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load students.");
      }

      setStudents(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the API. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadStudents();
    }
  }, [token, loadStudents]);

  async function handleLogin(event) {
    event.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      if (!result.token) {
        throw new Error("The server did not return a login token.");
      }

      const email = result.admin?.email || loginForm.email;

      sessionStorage.setItem("studenthub_token", result.token);
      sessionStorage.setItem("studenthub_admin", email);

      setToken(result.token);
      setAdminEmail(email);
      setLoginForm({
        email: "",
        password: "",
      });
    } catch (err) {
      setLoginError(
        err.message || "Unable to log in. Please check your connection."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const isEditing = Boolean(editingId);

    try {
      const response = await fetch(
        isEditing
          ? `${API_BASE}/students/${editingId}`
          : `${API_BASE}/students`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            year: Number(form.year),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        logout();
        setLoginError("Your session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Could not update student."
              : "Could not add student.")
        );
      }

      setForm({
        name: "",
        email: "",
        rollNumber: "",
        course: "",
        year: "1",
      });

      setEditingId(null);

      await loadStudents();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  function handleEdit(student) {
    setForm({
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      course: student.course,
      year: String(student.year),
    });

    setEditingId(student._id);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/students/${student._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        logout();
        setLoginError("Your session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Could not delete student.");
      }

      if (editingId === student._id) {
        setEditingId(null);

        setForm({
          name: "",
          email: "",
          rollNumber: "",
          course: "",
          year: "1",
        });
      }

      await loadStudents();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  // ========================================
  // DASHBOARD ANALYTICS
  // ========================================

  const courses = [
    ...new Set(
      students
        .map((student) => student.course?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const academicYears = [
    ...new Set(
      students
        .map((student) => Number(student.year))
        .filter((year) => Number.isFinite(year) && year > 0)
    ),
  ].sort((a, b) => a - b);

  // Count students in each course.
  const courseCounts = students.reduce((counts, student) => {
    const course = student.course?.trim();

    if (course) {
      counts[course] = (counts[course] || 0) + 1;
    }

    return counts;
  }, {});

  // Find the most popular course.
  const popularCourseEntry = Object.entries(courseCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];

  // Sort courses by enrollment, highest first.
  const sortedCourseCounts = Object.entries(courseCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  const chartMaxCount = Math.max(
    1,
    ...sortedCourseCounts.map(([, count]) => count)
  );

  // Count students in each academic year.
  const yearCounts = students.reduce((counts, student) => {
    const year = Number(student.year);

    if (Number.isFinite(year) && year > 0) {
      counts[year] = (counts[year] || 0) + 1;
    }

    return counts;
  }, {});

  // Display academic years in ascending order.
  const sortedYearCounts = Object.entries(yearCounts).sort(
    ([yearA], [yearB]) => Number(yearA) - Number(yearB)
  );

  const yearChartMaxCount = Math.max(
    1,
    ...sortedYearCounts.map(([, count]) => count)
  );

  // ========================================
  // SEARCH, FILTERS, AND PAGINATION
  // ========================================

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.trim().toLowerCase();

    const matchesSearch =
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.rollNumber?.toLowerCase().includes(query) ||
      student.course?.toLowerCase().includes(query);

    const matchesCourse =
      courseFilter === "All" || student.course === courseFilter;

    return matchesSearch && matchesCourse;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize)
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const startRecord =
    filteredStudents.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const endRecord = Math.min(
    currentPage * pageSize,
    filteredStudents.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, courseFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ========================================
  // ADMIN LOGIN PAGE
  // ========================================

  if (!token) {
    return (
      <main className="app login-page">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">S</div>

            <div>
              <h1>StudentHub</h1>
              <p>Student Management System</p>
            </div>
          </div>

          <span className="status">
            <span /> Admin Login
          </span>
        </header>

        <section className="login-card panel">
          <p className="eyebrow">ADMINISTRATOR</p>
          <h2>Welcome back</h2>

          <p className="panel-description">
            Sign in to manage your student records.
          </p>

          {loginError && (
            <div className="error-message" role="alert">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label>
              Admin Email

              <input
                type="email"
                autoComplete="username"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    email: event.target.value,
                  })
                }
                placeholder="Enter admin email"
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    password: event.target.value,
                  })
                }
                placeholder="Enter password"
                required
              />
            </label>

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </section>

        <footer>StudentHub · Secure Admin Portal</footer>
      </main>
    );
  }

  // ========================================
  // MAIN DASHBOARD
  // ========================================

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">S</div>

          <div>
            <h1>StudentHub</h1>
            <p>Student Management System</p>
          </div>
        </div>

        <div className="admin-actions">
          <span className="status">
            <span /> Admin Portal
          </span>

          <button
            className="refresh-button"
            type="button"
            onClick={logout}
          >
            Log Out
          </button>
        </div>
      </header>

      <section className="welcome">
        <p className="eyebrow">DASHBOARD</p>
        <h2>Manage your students</h2>

        <p>
          Signed in as {adminEmail}. Manage your student records securely.
        </p>
      </section>

      {/* DASHBOARD STATISTICS */}

      <section className="stats" aria-label="Dashboard statistics">
        <div className="stat-card stat-card-primary">
          <span>Total Students</span>

          <strong>
            {loading && students.length === 0 ? "—" : students.length}
          </strong>

          <small>
            {loading && students.length === 0
              ? "Loading student records..."
              : "Student records in your database"}
          </small>
        </div>

        <div className="stat-card">
          <span>Courses Offered</span>

          <strong>
            {loading && students.length === 0 ? "—" : courses.length}
          </strong>

          <small>Unique courses represented</small>
        </div>

        <div className="stat-card">
          <span>Academic Years</span>

          <strong>
            {loading && students.length === 0
              ? "—"
              : academicYears.length}
          </strong>

          <small>
            {academicYears.length > 0
              ? `Year${academicYears.length === 1 ? "" : "s"} ${academicYears.join(", ")}`
              : loading
                ? "Loading year data..."
                : "No year data yet"}
          </small>
        </div>

        <div className="stat-card">
          <span>Most Popular Course</span>

          <strong className="stat-course-name">
            {loading && students.length === 0
              ? "—"
              : popularCourseEntry?.[0] || "—"}
          </strong>

          <small>
            {popularCourseEntry
              ? `${popularCourseEntry[1]} student${popularCourseEntry[1] === 1 ? "" : "s"} enrolled`
              : loading
                ? "Calculating enrollment..."
                : "No course data yet"}
          </small>
        </div>
      </section>

      {/* COURSE AND YEAR ANALYTICS */}

      <section className="analytics-grid" aria-label="Student analytics">
        {/* COURSE ENROLLMENT CHART */}

        <div
          className="panel course-chart-panel"
          aria-labelledby="course-chart-title"
        >
          <div className="course-chart-heading">
            <div>
              <p className="eyebrow">COURSE OVERVIEW</p>

              <h3 id="course-chart-title">Course Enrollment</h3>

              <p className="panel-description">
                Number of students enrolled in each course.
              </p>
            </div>

            <span className="chart-total">
              {loading && students.length === 0
                ? "Loading..."
                : `${students.length} student${students.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {loading && students.length === 0 ? (
            <p className="empty-state">
              Loading course statistics...
            </p>
          ) : sortedCourseCounts.length === 0 ? (
            <p className="empty-state">
              No course data yet. Add a student with a course to see the chart.
            </p>
          ) : (
            <div
              className="course-chart"
              role="list"
              aria-label="Students per course"
            >
              {sortedCourseCounts.map(([course, count]) => {
                const barWidth = (count / chartMaxCount) * 100;

                return (
                  <div
                    className="course-chart-row"
                    role="listitem"
                    key={course}
                  >
                    <div className="course-chart-label">
                      <span title={course}>{course}</span>
                      <strong>{count}</strong>
                    </div>

                    <div
                      className="course-chart-track"
                      role="img"
                      aria-label={`${course}: ${count} student${count === 1 ? "" : "s"}`}
                    >
                      <div
                        className="course-chart-bar"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ACADEMIC YEAR CHART */}

        <div
          className="panel course-chart-panel"
          aria-labelledby="year-chart-title"
        >
          <div className="course-chart-heading">
            <div>
              <p className="eyebrow">ACADEMIC OVERVIEW</p>

              <h3 id="year-chart-title">Students by Year</h3>

              <p className="panel-description">
                Distribution across academic years.
              </p>
            </div>
          </div>

          {loading && students.length === 0 ? (
            <p className="empty-state">
              Loading year statistics...
            </p>
          ) : sortedYearCounts.length === 0 ? (
            <p className="empty-state">
              No academic-year data available yet.
            </p>
          ) : (
            <div
              className="course-chart"
              role="list"
              aria-label="Students per academic year"
            >
              {sortedYearCounts.map(([year, count]) => {
                const barWidth = (count / yearChartMaxCount) * 100;

                const suffix =
                  Number(year) === 1
                    ? "st"
                    : Number(year) === 2
                      ? "nd"
                      : Number(year) === 3
                        ? "rd"
                        : "th";

                return (
                  <div
                    className="course-chart-row"
                    role="listitem"
                    key={year}
                  >
                    <div className="course-chart-label">
                      <span>{`${year}${suffix} Year`}</span>
                      <strong>{count}</strong>
                    </div>

                    <div
                      className="course-chart-track"
                      role="img"
                      aria-label={`Year ${year}: ${count} student${count === 1 ? "" : "s"}`}
                    >
                      <div
                        className="course-chart-bar year-chart-bar"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* ADD AND EDIT STUDENT FORM */}

      <section className="content-grid">
        <div className="panel">
          <h3>{editingId ? "Edit Student" : "Add a Student"}</h3>

          <p className="panel-description">
            Enter the student's information below.
          </p>

          <form onSubmit={handleSubmit}>
            <label>
              Full Name

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Kumar"
                required
              />
            </label>

            <label>
              Email Address

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
              />
            </label>

            <label>
              Roll Number

              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="e.g. STU004"
                required
              />
            </label>

            <label>
              Course

              <input
                name="course"
                value={form.course}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
                required
              />
            </label>

            <label>
              Year of Study

              <select
                name="year"
                value={form.year}
                onChange={handleChange}
              >
                <option value="1">First Year</option>
                <option value="2">Second Year</option>
                <option value="3">Third Year</option>
                <option value="4">Fourth Year</option>
              </select>
            </label>

            <button type="submit">
              {editingId ? "Save Changes" : "+ Add Student"}
            </button>

            {editingId && (
              <button
                type="button"
                className="refresh-button"
                onClick={() => {
                  setEditingId(null);

                  setForm({
                    name: "",
                    email: "",
                    rollNumber: "",
                    course: "",
                    year: "1",
                  });

                  setError("");
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* STUDENT RECORDS */}

        <div className="panel students-panel">
          <div className="student-filters">
            <input
              type="search"
              placeholder="Search name, email, roll number, or course..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search students"
            />

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              aria-label="Filter by course"
            >
              <option value="All">All Courses</option>

              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="table-heading">
            <div>
              <h3>Student Records</h3>

              <p className="panel-description">
                Your saved student information.
              </p>
            </div>

            <button
              className="refresh-button"
              type="button"
              onClick={loadStudents}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Loading students...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="empty-state">
              {students.length === 0
                ? "No students found. Add your first student using the form."
                : "No matching students found. Try a different search or course."}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr key={student._id}>
                      <td>
                        <strong>{student.name}</strong>
                        <small className="email">
                          {student.email}
                        </small>
                      </td>

                      <td>{student.rollNumber}</td>
                      <td>{student.course}</td>
                      <td>{student.year}</td>

                      <td>
                        <div className="student-actions">
                          <button
                            type="button"
                            className="refresh-button"
                            onClick={() => handleEdit(student)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleDelete(student)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}

          {!loading && filteredStudents.length > 0 && (
            <div className="pagination">
              <p className="pagination-info">
                Showing {startRecord}–{endRecord} of{" "}
                {filteredStudents.length} students
              </p>

              <div className="pagination-controls">
                <label htmlFor="page-size">Rows:</label>

                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value))
                  }
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>

                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => page - 1)
                  }
                >
                  Previous
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    type="button"
                    key={page}
                    className={`pagination-button ${
                      currentPage === page ? "active" : ""
                    }`}
                    aria-current={
                      currentPage === page ? "page" : undefined
                    }
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="pagination-button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => page + 1)
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer>
        StudentHub · Built with React, Express and MongoDB
      </footer>
    </main>
  );
}

export default App;