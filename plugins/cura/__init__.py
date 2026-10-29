# -*- coding: utf-8 -*-
# Slice2Price — UltiMaker Cura Plugin
from . import Slice2PricePlugin

def getMetaData():
    return {}

def register(app):
    return {
        "extension": Slice2PricePlugin.Slice2PriceExtension()
    }
