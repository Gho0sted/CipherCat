; Дополнительные настройки для NSIS установщика CipherCat
; Автор: Ghosted (https://github.com/Gho0sted)

; Установка иконки для ярлыка
!macro customInstall
  ; Создание ярлыка на рабочем столе
  CreateShortCut "$DESKTOP\CipherCat.lnk" "$INSTDIR\CipherCat.exe" "" "$INSTDIR\CipherCat.exe" 0
  
  ; Создание ярлыка в меню Пуск
  CreateDirectory "$SMPROGRAMS\CipherCat"
  CreateShortCut "$SMPROGRAMS\CipherCat\CipherCat.lnk" "$INSTDIR\CipherCat.exe" "" "$INSTDIR\CipherCat.exe" 0
  CreateShortCut "$SMPROGRAMS\CipherCat\Uninstall CipherCat.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
  
  ; Регистрация ассоциаций файлов
  WriteRegStr HKCR ".cipher" "" "CipherCat.Document"
  WriteRegStr HKCR "CipherCat.Document" "" "CipherCat Encrypted Document"
  WriteRegStr HKCR "CipherCat.Document\DefaultIcon" "" "$INSTDIR\CipherCat.exe,0"
  WriteRegStr HKCR "CipherCat.Document\shell\open\command" "" '"$INSTDIR\CipherCat.exe" "%1"'
!macroend

; Удаление при деинсталляции
!macro customUnInstall
  ; Удаление ярлыков
  Delete "$DESKTOP\CipherCat.lnk"
  Delete "$SMPROGRAMS\CipherCat\CipherCat.lnk"
  Delete "$SMPROGRAMS\CipherCat\Uninstall CipherCat.lnk"
  RMDir "$SMPROGRAMS\CipherCat"
  
  ; Удаление ассоциаций файлов
  DeleteRegKey HKCR ".cipher"
  DeleteRegKey HKCR "CipherCat.Document"
!macroend

; Настройки интерфейса установщика
!macro customHeader
  ; Заголовок установщика
  !define MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE_BITMAP "assets\installer-header.bmp"
  !define MUI_HEADERIMAGE_UNBITMAP "assets\installer-header.bmp"
!macroend

; Проверка системных требований
!macro customInit
  ; Проверка версии Windows
  ${If} ${AtMostWin7}
    MessageBox MB_OK "CipherCat requires Windows 8 or later. Please upgrade your operating system."
    Quit
  ${EndIf}
  
  ; Проверка архитектуры
  ${If} ${RunningX64}
    ; 64-bit система
  ${Else}
    ; 32-bit система
  ${EndIf}
!macroend
