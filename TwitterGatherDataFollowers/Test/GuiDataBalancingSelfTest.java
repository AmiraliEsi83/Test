package TwitterGatherDataFollowers.userRyersonU;

import java.awt.Component;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JPanel;

public final class GuiDataBalancingSelfTest {
	private GuiDataBalancingSelfTest() {
	}

	public static void main(String[] args) {
		constantsDescribeOriginalAndBalancedChoices();
		sharedModelKeepsFileDialogAndMainPanelInSync();
		fileChooserCanHostTheBalancingAccessory();
		System.out.println("GuiDataBalancingSelfTest passed");
	}

	private static void constantsDescribeOriginalAndBalancedChoices() {
		require(ControllerAgentGui.DATA_BALANCING_ORIGINAL.contains("Original"),
				"original balancing label is unclear");
		require(ControllerAgentGui.DATA_BALANCING_OVERSAMPLE.contains("Balanced"),
				"balanced label is unclear");
		require(ControllerAgentGui.DATA_BALANCING_ORIGINAL.contains("no balancing"),
				"original label should say no balancing");
	}

	private static void sharedModelKeepsFileDialogAndMainPanelInSync() {
		DefaultComboBoxModel<String> model = new DefaultComboBoxModel<String>(new String[] {
				ControllerAgentGui.DATA_BALANCING_ORIGINAL,
				ControllerAgentGui.DATA_BALANCING_OVERSAMPLE
		});
		JComboBox<String> mainBox = new JComboBox<String>(model);
		JComboBox<String> fileBox = new JComboBox<String>(model);
		require(ControllerAgentGui.DATA_BALANCING_ORIGINAL.equals(mainBox.getSelectedItem()),
				"default should be original dataset");
		fileBox.setSelectedItem(ControllerAgentGui.DATA_BALANCING_OVERSAMPLE);
		require(ControllerAgentGui.DATA_BALANCING_OVERSAMPLE.equals(mainBox.getSelectedItem()),
				"file-dialog change should update the main combo");
		mainBox.setSelectedItem(ControllerAgentGui.DATA_BALANCING_ORIGINAL);
		require(ControllerAgentGui.DATA_BALANCING_ORIGINAL.equals(fileBox.getSelectedItem()),
				"main-panel change should update the file-dialog combo");
	}

	private static void fileChooserCanHostTheBalancingAccessory() {
		JFileChooser chooser = new JFileChooser();
		JPanel accessory = new JPanel();
		JComboBox<String> box = new JComboBox<String>(new String[] {
				ControllerAgentGui.DATA_BALANCING_ORIGINAL,
				ControllerAgentGui.DATA_BALANCING_OVERSAMPLE
		});
		accessory.add(box);
		chooser.setAccessory(accessory);
		Component hosted = chooser.getAccessory();
		require(hosted == accessory, "file chooser accessory was not attached");
	}

	private static void require(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}
}
