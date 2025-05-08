import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

export default function EditBirthdayModal({
  open,
  formData,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Editar Persona</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Nombre"
          name="name"
          value={formData.name}
          onChange={onChange}
          fullWidth
        />
        <TextField
          margin="dense"
          label="Apellido"
          name="last_name"
          value={formData.last_name}
          onChange={onChange}
          fullWidth
        />
        <TextField
          margin="dense"
          label="Teléfono"
          name="phone"
          value={formData.phone}
          onChange={onChange}
          fullWidth
        />
        <TextField
          margin="dense"
          label="Fecha de Nacimiento"
          name="birthday"
          type="date"
          value={formData.birthday}
          onChange={onChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
