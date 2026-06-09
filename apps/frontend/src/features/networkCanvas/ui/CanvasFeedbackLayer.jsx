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
import { useTranslation } from 'react-i18next';

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
    planStatus,
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
    const { t } = useTranslation();

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
                <DialogTitle>{t('canvas.feedback.outdatedTitle')}</DialogTitle>

                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {t('canvas.feedback.outdatedDescription')}
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => {
                            setEditGuardOpen(false);
                            if (canvasPlanId) navigate(`/admin/plans/${canvasPlanId}`);
                        }}
                    >
                        {t('canvas.feedback.viewPlan')}
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setEditGuardOpen(false);
                            processJsonToCloud();
                        }}
                    >
                        {t('canvas.feedback.revalidate')}
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setEditGuardOpen(false);
                            setIgnoreDirtyGuard(true);
                            editGuardRef.current = { fn: null, args: null };
                        }}
                    >
                        {t('canvas.feedback.keepEditing')}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDeployDialog
                open={showConfirmation && restorationDone}
                onClose={handleCancelDeploy}
                validationState={validationState}
                canvasState={canvasState}
                planStatus={planStatus}
                validationResult={validationResult}
                transformedData={transformedData}
                onValidate={handleValidatePlan}
                onDeploy={handleApplyReal}
                onViewPlan={() =>
                    handleOpenPlanDetails(validationResult?.plan_id || planStatus?.id)
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
