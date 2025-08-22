import { Box, Button, Paper, TextField, Typography } from "@mui/material"
import { useForm } from "react-hook-form"
import { useAuth } from "../../../contexts/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../../../firebase/firebaseConfig"
import { DB_FIRESTORE_USERS } from "../../../constants"
import { useEffect } from "react"



const GeneralSettings = () => {
  const { user } = useAuth()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm()


  useEffect(() => {
    const fetchData = async () => {
      if (user && user.userId) {
        const userRef = doc(db, DB_FIRESTORE_USERS, user.userId)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          // console.log("User data:", userData)

          // Pre-llenamos los valores en el formulario
          setValue("url_api_aws", userData.settings?.general?.url_api_aws || "")
        } else {
          // console.log("El documento no existe");
        }
      }
    }

    fetchData()
  }, [user, setValue])

  const handleOnSubmitSettings = async (data) => {
    // console.log(data);
    // console.log(user);

    const userRef = doc(db, DB_FIRESTORE_USERS, user.userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      // console.log('User data: ', userSnap.data());

      await updateDoc(userRef, {
        settings: {
          general: {
            url_api_aws: data.url_api_aws
          }
        }
      })

    } else {
      // console.log("El documento no existe");
    }

    // console.log(userSnap.data());



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