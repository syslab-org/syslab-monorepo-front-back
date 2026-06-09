import { Stack, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import { changeLanguage, getCurrentLanguage } from "@/shared/i18n";

export default function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation();
  const language = getCurrentLanguage();

  const handleChange = (_, nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) return;
    changeLanguage(nextLanguage);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {!compact ? (
        <Tooltip title={t("common.language")}>
          <ToggleButtonGroup
            size="small"
            value={language}
            exclusive
            onChange={handleChange}
            aria-label={t("common.language")}
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.25,
                py: 0.5,
                textTransform: "none",
                fontWeight: 700,
              },
            }}
          >
            <ToggleButton value="es" aria-label={t("common.spanish")}>
              ES
            </ToggleButton>
            <ToggleButton value="en" aria-label={t("common.english")}>
              EN
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      ) : (
        <ToggleButtonGroup
          size="small"
          value={language}
          exclusive
          onChange={handleChange}
          aria-label={t("common.language")}
          sx={{
            "& .MuiToggleButton-root": {
              minWidth: 36,
              px: 1,
              py: 0.5,
              color: "inherit",
              borderColor: "rgba(255,255,255,0.24)",
            },
          }}
        >
          <ToggleButton value="es" aria-label={t("common.spanish")}>
            ES
          </ToggleButton>
          <ToggleButton value="en" aria-label={t("common.english")}>
            EN
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Stack>
  );
}
