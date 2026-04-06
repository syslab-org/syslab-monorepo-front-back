import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { EditOutlined, PersonAddAlt1Outlined, PersonRemoveOutlined } from '@mui/icons-material'

import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import { useAuth } from '@/app/providers/AuthContext'
import { api } from '@/infrastructure/http/api'
import { PageHeader } from '@/shared/ui/layouts/MainLayout'
import { ModalLayout } from '@/shared/ui/layouts/ModalLayout'
import { USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '@/shared/constants'

const EMPTY_FORM = {
  name: '',
  code: '',
  teacher_id: '',
  is_active: true,
}

const CourseForm = ({ form, setForm, teachers, canAssignTeacher, isEditing, onSubmit, onCancel }) => (
  <Box component="form" onSubmit={onSubmit}>
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700}>
        {isEditing ? 'Editar curso' : 'Crear curso'}
      </Typography>

      <TextField
        label="Nombre"
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        required
        fullWidth
      />

      <TextField
        label="Código"
        value={form.code}
        onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
        fullWidth
      />

      {canAssignTeacher && (
        <FormControl fullWidth>
          <InputLabel id="course-teacher-label">Profesor</InputLabel>
          <Select
            labelId="course-teacher-label"
            label="Profesor"
            value={form.teacher_id}
            onChange={(event) => setForm((prev) => ({ ...prev, teacher_id: event.target.value }))}
          >
            <MenuItem value="">Sin reasignar</MenuItem>
            {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={teacher.id}>
                {teacher.display_name || teacher.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Switch
          checked={!!form.is_active}
          onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
        />
        <Typography variant="body2">
          Curso activo
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="contained">
          {isEditing ? 'Guardar cambios' : 'Crear curso'}
        </Button>
      </Stack>
    </Stack>
  </Box>
)

export const CoursesManagement = () => {
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { user } = useAuth()

  const [courses, setCourses] = useState([])
  const [users, setUsers] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isAdmin = user?.role === USER_ROL_SUPER_ADMIN
  const canAssignTeacher = isAdmin

  const fetchData = useCallback(async () => {
    setLoadingFlow(true)
    try {
      const [coursesResponse, usersResponse] = await Promise.all([
        api.listCourses(),
        api.listUsers(),
      ])
      setCourses(Array.isArray(coursesResponse) ? coursesResponse : [])
      setUsers(Array.isArray(usersResponse) ? usersResponse : [])
    } catch (error) {
      console.error('Error loading courses/users:', error)
      alert(error?.message || 'No se pudieron cargar los cursos.')
    } finally {
      setLoadingFlow(false)
    }
  }, [setLoadingFlow])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  const teachers = useMemo(
    () => users.filter((candidate) => candidate.role === USER_ROL_TEACHER),
    [users],
  )

  const students = useMemo(
    () => users.filter((candidate) => candidate.role !== USER_ROL_TEACHER && candidate.role !== USER_ROL_SUPER_ADMIN),
    [users],
  )

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  )

  const selectedCourseStudents = useMemo(
    () => students.filter((student) => student.course?.id === selectedCourseId),
    [students, selectedCourseId],
  )

  const availableStudents = useMemo(
    () => students.filter((student) => student.course?.id !== selectedCourseId),
    [students, selectedCourseId],
  )

  const openCreateModal = () => {
    setEditingCourse(null)
    setForm(EMPTY_FORM)
    setIsModalOpen(true)
  }

  const openEditModal = (course) => {
    setEditingCourse(course)
    setForm({
      name: course.name || '',
      code: course.code || '',
      teacher_id: course.teacher_id ? String(course.teacher_id) : '',
      is_active: !!course.is_active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCourse(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      alert('Debes indicar un nombre para el curso.')
      return
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      is_active: !!form.is_active,
    }

    if (canAssignTeacher && form.teacher_id) {
      payload.teacher_id = Number(form.teacher_id)
    }

    setLoadingFlow(true)
    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse.id, payload)
      } else {
        await api.createCourse(payload)
      }
      await fetchData()
      closeModal()
    } catch (error) {
      console.error('Error saving course:', error)
      alert(error?.message || 'No se pudo guardar el curso.')
    } finally {
      setLoadingFlow(false)
    }
  }

  const handleEnrollStudent = async () => {
    if (!selectedCourseId || !selectedStudentId) {
      alert('Selecciona un curso y un alumno.')
      return
    }

    setLoadingFlow(true)
    try {
      await api.enrollStudent(selectedCourseId, Number(selectedStudentId))
      setSelectedStudentId('')
      await fetchData()
    } catch (error) {
      console.error('Error enrolling student:', error)
      alert(error?.message || 'No se pudo asignar el alumno al curso.')
    } finally {
      setLoadingFlow(false)
    }
  }

  const handleRemoveStudent = async (studentId) => {
    if (!selectedCourseId) return

    setLoadingFlow(true)
    try {
      await api.removeStudent(selectedCourseId, Number(studentId))
      await fetchData()
    } catch (error) {
      console.error('Error removing student:', error)
      alert(error?.message || 'No se pudo remover el alumno del curso.')
    } finally {
      setLoadingFlow(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Gestión de Cursos"
        subtitle="Administra cursos, profesores responsables y asignación de alumnos según el modelo académico del laboratorio."
        actions={
          <Button variant="contained" onClick={openCreateModal}>
            Crear curso
          </Button>
        }
      />

      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Curso</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Profesor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Alumnos</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((course) => {
                  const totalStudents = students.filter((student) => student.course?.id === course.id).length
                  return (
                    <TableRow
                      key={course.id}
                      hover
                      selected={course.id === selectedCourseId}
                      onClick={() => setSelectedCourseId(course.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.code || '-'}</TableCell>
                      <TableCell>{course.teacher_email || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={course.is_active ? 'success' : 'default'}
                          label={course.is_active ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                      <TableCell>{totalStudents}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<EditOutlined />}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEditModal(course)
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {selectedCourse ? (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Roster del curso
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCourse.name} · {selectedCourse.teacher_email || 'Sin profesor visible'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Aquí puedes asignar alumnos sin curso o mover alumnos desde otros cursos hacia este roster.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <FormControl fullWidth>
                  <InputLabel id="enroll-student-label">Alumno disponible para asignar</InputLabel>
                  <Select
                    labelId="enroll-student-label"
                    label="Alumno disponible para asignar"
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                  >
                    {availableStudents.length === 0 && (
                      <MenuItem value="" disabled>
                        No hay alumnos sin curso ni alumnos de otros cursos para mover
                      </MenuItem>
                    )}
                    {availableStudents.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.display_name || student.email} · {student.course?.name || 'Sin curso'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<PersonAddAlt1Outlined />}
                  onClick={handleEnrollStudent}
                  disabled={!selectedStudentId}
                >
                  Asignar alumno
                </Button>
              </Stack>

              {selectedCourseStudents.length === 0 ? (
                <Alert severity="info">Este curso todavía no tiene alumnos asignados.</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Alumno</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCourseStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.display_name || '-'}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.status}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              startIcon={<PersonRemoveOutlined />}
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </Paper>
        ) : (
          <Alert severity="info">Aún no hay cursos disponibles para gestionar.</Alert>
        )}
      </Stack>

      <ModalLayout open={isModalOpen} closeModal={closeModal}>
        <CourseForm
          form={form}
          setForm={setForm}
          teachers={teachers}
          canAssignTeacher={canAssignTeacher}
          isEditing={!!editingCourse}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </ModalLayout>
    </Box>
  )
}

export default CoursesManagement
