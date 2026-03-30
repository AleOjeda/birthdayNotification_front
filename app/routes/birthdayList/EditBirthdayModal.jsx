import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";

export default function EditBirthdayModal({
  open,
  formData,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>✏️ Editar</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Nombre"
            name="name"
            value={formData.name}
            onChange={onChange}
            fullWidth
          />

          <TextField
            label="Apellido"
            name="last_name"
            value={formData.last_name}
            onChange={onChange}
            fullWidth
          />

          <TextField
            type="date"
            label="Fecha"
            name="birthday"
            value={formData.birthday}
            onChange={onChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
