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
        Defensivo contra variaciones de argumentos de señal en Cura (Falla E10).
        """
        try:
            time_seconds = args[0] if len(args) > 0 and isinstance(args[0], (int, float)) else 0
            material_amounts = args[1] if len(args) > 1 else []
            print_information = self._application.getPrintInformation()
            current_time = print_information.currentPrintTime
            total_time_hours = current_time.getDisplayString() if hasattr(current_time, 'getDisplayString') else str(time_seconds / 3600.0)

            # Extraer material en gramos
            material_weights = print_information.materialWeights
            total_grams = sum(material_weights) if material_weights else 0.0

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
