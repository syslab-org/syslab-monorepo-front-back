import {
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from "@mui/material";

import ConfirmDeployDialog from "@/features/networkCanvas/modals/ConfirmDeployDialog";

export default function CanvasFeedbackLayer({
    canvasUiError,
    setCanvasUiError,
    editGuardOpen,
    setEditGuardOpen,
    canvasPlanId,
    navigate,
    processJsonToCloud,
    setIgnoreDirtyGuard,
    editGuardRef,
    showConfirmation,
    restorationDone,
    handleCancelDeploy,
    validationState,
    canvasState,
    validationResult,
    transformedData,
    handleValidatePlan,
    handleApplyReal,
    handleOpenPlanDetails,
    loadingFlow,
    successMessage,
    errorMessage,
    handleCloseSnackbar
}) {
    return (
        <>
            <Snackbar
                open={!!canvasUiError}
                autoHideDuration={6000}
                onClose={(_e, reason) => {
                    if (reason === "clickaway") return;
                    setCanvasUiError(null);
                }}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="warning" variant="filled" sx={{ width: "100%" }}>
                    {canvasUiError}
                </Alert>
            </Snackbar>

            <Dialog
                open={editGuardOpen}
                onClose={() => setEditGuardOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Canvas desactualizado vs Plan</DialogTitle>

                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Este canvas cambió desde la última validación asociada al plan.
                        Si sigues editando, el plan ya no representa exactamente lo que
                        estás viendo.
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => {
                            setEditGuardOpen(false);
                            if (canvasPlanId) navigate(`/admin/plans/${canvasPlanId}`);
                        }}
                    >
                        Ver plan
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setEditGuardOpen(false);
                            processJsonToCloud();
                        }}
                    >
                        Re-validar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setEditGuardOpen(false);
                            setIgnoreDirtyGuard(true);
                            editGuardRef.current = { fn: null, args: null };
                        }}
                    >
                        Seguir editando
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDeployDialog
                open={showConfirmation && restorationDone}
                onClose={handleCancelDeploy}
                validationState={validationState}
                canvasState={canvasState}
                validationResult={validationResult}
                transformedData={transformedData}
                onValidate={handleValidatePlan}
                onDeploy={handleApplyReal}
                onViewPlan={() =>
                    handleOpenPlanDetails(validationResult?.plan_id)
                }
                loadingFlow={loadingFlow}
            />

            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="success" variant="filled">
                    {successMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!errorMessage}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="error">{errorMessage}</Alert>
            </Snackbar>
        </>
    );
}