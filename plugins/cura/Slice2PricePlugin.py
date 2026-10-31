# -*- coding: utf-8 -*-
# Slice2Price — Plugin de integración para UltiMaker Cura
# Envía automáticamente el tiempo de impresión y peso de material a Slice2Price.

import os
import json
import time
from UM.Extension import Extension
from UM.Application import Application
from UM.Logger import Logger
from cura.CuraApplication import CuraApplication

class Slice2PriceExtension(Extension):
    def __init__(self):
        super().__init__()
        self._application = CuraApplication.getInstance()
        self._application.getController().getScene().sceneChanged.connect(self._onSceneChanged)

        # Escuchar evento cuando termine el laminado
        backend = self._application.getBackend()
        if backend:
            backend.printDurationMessage.connect(self._onSliceFinished)

        Logger.log("i", "[Slice2Price] Plugin inicializado correctamente.")

    def _onSceneChanged(self):
        pass

    def _onSliceFinished(self, *args, **kwargs):
        """
        Se ejecuta cuando Cura finaliza el cálculo de laminación.
        Guarda los datos en la carpeta de intercambio de Slice2Price.
        La señal printDurationMessage de Cura emite:
        (plate_number, time_dict, material_amounts, material_lengths, material_weights, material_costs, material_names)
        """
        try:
            time_seconds = 0.0
            total_grams = 0.0

            # 1. Extraer tiempo en segundos (args[1] es time_dict en CuraEngine)
            if len(args) > 1 and isinstance(args[1], dict):
                if 'total' in args[1]:
                    time_seconds = float(args[1]['total'])
                else:
                    time_seconds = float(sum(v for v in args[1].values() if isinstance(v, (int, float))))
            elif len(args) > 0 and isinstance(args[0], (int, float)) and args[0] > 10:
                time_seconds = float(args[0])

            # Respaldo si time_seconds sigue en 0
            if time_seconds <= 0:
                try:
                    cur_time = self._application.getPrintInformation().currentPrintTime
                    if hasattr(cur_time, 'getRawValue'):
                        time_seconds = float(cur_time.getRawValue())
                except Exception:
                    pass

            # 2. Extraer peso en gramos (args[4] es material_weights en CuraEngine)
            if len(args) > 4 and isinstance(args[4], (list, tuple)) and len(args[4]) > 0:
                total_grams = float(sum(args[4]))
            else:
                try:
                    weights = self._application.getPrintInformation().materialWeights
                    if weights:
                        total_grams = float(sum(weights))
                except Exception:
                    pass

            # Nombre del proyecto / modelo activo
            scene_root = self._application.getController().getScene().getRoot()
            model_name = "Modelo_Cura"
            for child in scene_root.getChildren():
                if hasattr(child, 'getName') and child.getName():
                    model_name = child.getName()
                    break

            payload = {
                "slicerName": "UltiMaker Cura",
                "pieceName": model_name,
                "printTimeSeconds": int(time_seconds),
                "printTimeHours": round(time_seconds / 3600.0, 2),
                "filamentGrams": round(float(total_grams), 2),
                "timestamp": int(time.time()),
            }

            # Guardar archivo puente en AppData para el vigilante de Slice2Price
            app_data = os.environ.get("APPDATA", "")
            target_dir = os.path.join(app_data, "cura", "Slice2Price")
            os.makedirs(target_dir, exist_ok=True)

            out_file = os.path.join(target_dir, f"{model_name}.gcode.txt")
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(f";Generated with Cura_SteamEngine\n")
                f.write(f";TIME:{int(time_seconds)}\n")
                f.write(f";Filament used: {round(float(total_grams), 2)}g\n")
                f.write(f";Slice2Price_JSON: {json.dumps(payload)}\n")

            Logger.log("i", f"[Slice2Price] Datos exportados a: {out_file}")
        except Exception as e:
            Logger.log("e", f"[Slice2Price] Error exportando datos de laminado: {str(e)}")
