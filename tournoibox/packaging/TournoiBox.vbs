' Lance TournoiBox sans fenêtre noire (le serveur tourne en arrière-plan, l'interface s'ouvre dans le navigateur).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run """" & dir & "\node\node.exe"" """ & dir & "\launcher.mjs""", 0, False
