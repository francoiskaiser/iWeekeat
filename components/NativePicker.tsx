import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface PickerOption {
  label: string;
  value: string;
}

interface NativePickerProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
  enabled?: boolean;
}

export interface NativePickerRef {
  open: () => void;
  close: () => void;
}

export const NativePicker = forwardRef<NativePickerRef, NativePickerProps>(({
  label,
  selectedValue,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  enabled = true,
}, ref) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Permet au composant parent (le Planificateur) de forcer l'ouverture du menu
  useImperativeHandle(ref, () => ({
    open: () => setModalVisible(true),
    close: () => setModalVisible(false)
  }));

  const selectedOption = options.find((o) => o.value === selectedValue);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {/* BOUTON DÉCLENCHEUR */}
      <TouchableOpacity 
        style={[styles.triggerButton, !enabled && styles.triggerButtonDisabled]} 
        onPress={() => enabled && setModalVisible(true)}
        activeOpacity={enabled ? 0.7 : 1}
      >
        <Text style={[styles.triggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={enabled ? "#FF7A41" : "#cbd5e1"} />
      </TouchableOpacity>

      {/* LE TIROIR BOTTOM SHEET */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          {/* Zone cliquable pour fermer le tiroir en cliquant dans le vide */}
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.bottomSheet}>
            {/* Petite barre grise pour indiquer qu'on peut glisser/fermer */}
            <View style={styles.dragIndicator} />
            
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color="#e2e8f0" />
              </TouchableOpacity>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucune option disponible.</Text>
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity 
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]} 
                      onPress={() => handleSelect(item.value)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {/* Espace de sécurité pour les écrans sans bords (iPhone) */}
            <SafeAreaView edges={['bottom']} />
          </View>
        </View>
      </Modal>
    </View>
  );
});

NativePicker.displayName = 'NativePicker';

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  triggerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 55,
  },
  triggerButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  triggerText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  // --- Bottom Sheet Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Fond sombre transparent
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '30%',
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionItemSelected: {
    backgroundColor: '#10B98110', // Fond vert très léger si sélectionné
    borderRadius: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    marginVertical: 4,
  },
  optionText: {
    fontSize: 17,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#10B981', // Vert Frais
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
});