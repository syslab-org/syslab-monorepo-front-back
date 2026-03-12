import { Box, Button, Paper, TextField, Typography } from "@mui/material"
import { useForm } from "react-hook-form"
import { useAuth } from '@/app/providers/AuthContext'
import { useEffect } from "react"

import { api } from "@/infrastructure/http/api"

const GeneralSettings = () => {
  const { user, refreshUser } = useAuth()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    const settings = user?.settings?.general || {}
    setValue("url_api_aws", settings.url_api_aws || "")
  }, [user, setValue])

  const handleOnSubmitSettings = async (data) => {
    await api.updateMe({
      settings: {
        general: {
          url_api_aws: data.url_api_aws,
        },
      },
    })
    await refreshUser()
  }

  return (
    <Paper variant="lightPaper" sx={{ p: 4, maxWidth: 1300, margin: 'auto' }}>
      <Typography>
        General Settings
      </Typography>

      <Box component="form" onSubmit={handleSubmit(handleOnSubmitSettings)}>
        <Box sx={{ mt: 5, mb: 5 }}>
          <TextField
            label="URL API AWS"
            fullWidth
            {...register("url_api_aws")}
            error={!!errors.url_api_aws}
            helperText={errors.url_api_aws ? "Este campo es obligatorio" : ""}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Box sx={{ mt: 3 }} >
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}

export default GeneralSettings
