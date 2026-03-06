import { createContext, useCallback, useContext, useState } from 'react'

const WizardContext = createContext()

export const WizardProvider = ({ children }) => {

  const [active, setActive] = useState(false)
  const [step, setStepState] = useState("idle")

  const start = useCallback(() => {
    setActive(true)
    setStepState("idle")
  }, [])

  const finish = useCallback(() => {
    setActive(false)
    setStepState("completed")
  }, [])

  const setStep = useCallback((newStep) => {
    setStepState(newStep)
  }, [])

  return (
    <WizardContext.Provider value={{
      active,
      step,
      start,
      finish,
      setStep
    }}>
      {children}
    </WizardContext.Provider>
  )
}

export const useWizard = () => {
  const ctx = useContext(WizardContext)
  if (!ctx) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return ctx
}

