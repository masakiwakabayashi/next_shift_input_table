import React, { useRef, useEffect, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { registerRenderer, textRenderer } from 'handsontable/renderers';
import 'handsontable/dist/handsontable.full.min.css';
import {
    Box,
    Button,
} from "@chakra-ui/react";
import { db } from "../firebase/firebase";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

// Handsontableを使うための記述
registerAllModules();

const ShiftInput = (props: any) => {
    // props
    const { modalId } = props;
    // Handsontableを使うための記述
    const hotRef = useRef<HotTable>(null);
    // テーブル本体を構成する多次元配列を格納するためのuseState
    const [shiftTableData, setShiftTableData] = useState<any[][]>([]);
    // シフトの初期値を反映するための処理
    const [ teacherShiftDefaultData, setTeacherShiftDefaultData ] = useState<any>([]);


    // 日付の配列を作成する (すでに登録されているシフトデータを反映するために使う)
    const getClassDateRangeArrayForDefault = async () => {
        const classDateRangeRef = collection(db, 'date');
        const querySnapshot = await getDocs(classDateRangeRef);
        const docsClassDateData = querySnapshot.docs.map((doc)=>{
            return doc.id;
        });
        return docsClassDateData;
    }

    // すでに登録されているシフトデータを反映するための2次元配列を作成する関数
    const createShiftDefaultDataMatrix = async (teacherData: any) =>{
        const teacherShiftData: any = [];
        if (teacherData && teacherData.shift) {
            // シフトを構成するデータを取得する (Firestoreから取得したシフトデータの座標を調べるため)
            const classDateRangeArray = await getClassDateRangeArrayForDefault();
            const classTimeArray = await getClassTimeArray();
            // awaitを使うためにfor文を使ってループさせる
            for (const value of Object.values<any>(teacherData.shift)) {
                // リファレンスからドキュメントのデータを取得
                const classTimeRef = doc(db, 'time', value.class_time.id);
                const classTimeDoc = await getDoc(classTimeRef);
                const classTimeData = classTimeDoc.data();
                // 時限と講習期間がシフトを構成する配列の何番目なのかを取得
                const classDateRangeIndex = classDateRangeArray.indexOf(value.class_date_range.id) + 1;
                const classTimeIndex = classTimeArray.indexOf(classTimeData?.name) + 1;
                // シフト表を構成するデータを2次元配列に追加
                teacherShiftData.push([classDateRangeIndex, classTimeIndex]);
            }
        }
        return teacherShiftData;
    }

    // すでに登録されているシフト情報の取得
    const getShiftData = async () => {
        // 特定のスタッフのデータをFirestoreから取得
        const Ref = doc(db, 'staff', modalId);
        const querySnapshot = await getDoc(Ref);
        const staffData = querySnapshot.data();
        // 取得したデータからシフトデータを反映するための2次元配列を作成する
        const defaultShiftData = await createShiftDefaultDataMatrix(staffData);
        // シフトデータをuseStateにセット
        setTeacherShiftDefaultData(defaultShiftData);
    }

    // すでに登録されているシフト情報の取得を実行
    useEffect(()=>{
        getShiftData();
    },[modalId]);


    // 上記の関数で取得した、すでに登録されているシフトデータをテーブルに反映するための処理
    useEffect(()=>{
        if (hotRef.current) {
        const hot = hotRef.current.hotInstance;
        if (hot == null) return;
        teacherShiftDefaultData.map(([x,y]: [number, number])=>{
            hot.setDataAtCell(x, y, "-");
            hot.setCellMeta(x, y, 'className', 'bg-change-2');
        });
        }
    },[teacherShiftDefaultData]);


    // 日付の配列を作成する (シフト表本体の配列を作成するために使う)
    const getClassDateRangeArray = async () => {
        // Firestoreからdateコレクションのドキュメントを取得する
        const classDateRangeRef = collection(db, 'date');
        const querySnapshot = await getDocs(classDateRangeRef);
        // dateコレクションのドキュメントIDが日付になっているため、形式を変更して配列に格納する
        const docsClassDateData = querySnapshot.docs.map((doc: any) => {
            // 日付から曜日を取得する
            const date = new Date(doc.id);
            const dayOfWeek = date.getDay();
            const dayOfWeekString = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
            // 年数を除いて月と日だけの形式に変更する
            const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
            // 日付と曜日を結合して返す
            return formattedDate + ' (' + dayOfWeekString + ')';
        });
        return docsClassDateData;
    };

    // 時間帯の配列を作成する (シフト表本体の2次元配列を作成するために使う)
    const getClassTimeArray = async () => {
        // Firestoreからtimeコレクションのドキュメントを取得する
        const classDateRangeRef = collection(db, 'time');
        const classTimeQuerySnapshot = await getDocs(classDateRangeRef);
        // timeコレクションのドキュメントのnameフィールドの値を配列に格納する
        const classTimeDocsData = classTimeQuerySnapshot.docs.map((doc: any) => {
            return doc.data().name;
        });
        // その配列をリターンする
        return classTimeDocsData;
    }

    // 2つの配列の値を行と列にして2次元配列を作成するための関数
    const createMatrix = (arrayA: any, arrayB: any) => {
        const numRows = arrayA.length + 1;
        const numCols = arrayB.length + 1;
        const result = new Array(numRows);
        // 空の2次元配列を作成
        for (let i = 0; i < numRows; i++) {
            result[i] = new Array(numCols).fill('');
        }
        // 1列目に配列Aのデータを配置
        for (let i = 1; i < numRows; i++) {
            result[i][0] = arrayA[i - 1];
        }
        // 1行目に配列Bのデータを配置
        for (let j = 1; j < numCols; j++) {
            result[0][j] = arrayB[j - 1];
        }
        return result;
    };

    // 1列目が日付で1行目が時間帯なっている2次元配列を作成する
    const createDataArray = async () => {
        const classDateRangeArray = await getClassDateRangeArray();
        const classTimeArray = await getClassTimeArray();
        const matrix = createMatrix(classDateRangeArray, classTimeArray);
        setShiftTableData(matrix as any);
    }

    // 配列の作成を実行
    useEffect(()=>{
        createDataArray();
    },[hotRef]);


    // 選択されたセルの色を変更するための処理
    const changeSelectedCellsColor = async () => {
        if (hotRef.current) {
            const hot = hotRef.current.hotInstance;
            if (hot !== null) {
                hot.addHook('afterSelectionEnd', (row1, col1, row2, col2) => {
                const startRow = Math.min(row1, row2);
                const endRow = Math.max(row1, row2);
                const startCol = Math.min(col1, col2);
                const endCol = Math.max(col1, col2);
                hot.suspendRender();
                for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
                    for (let columnIndex = startCol; columnIndex <= endCol; columnIndex++) {
                        const currentData = hot.getDataAtCell(rowIndex, columnIndex);
                        const currentClassName = hot.getCellMeta(rowIndex, columnIndex).className;
                        // 1列目と1行目のセルは変更できないようにする
                        if (rowIndex !== 0 && columnIndex !== 0) {
                            // セルの値を変化させないと背景色が変化しないため、セルの値も変化させる
                            // 選択されたときのセルの値は-としているが、CSSで文字の色と背景色を同じにしているのでユーザーには見えない
                            if (currentData === '-' && currentClassName === 'bg-change') {
                                // すでに選択されているセルが再度選択された場合は元に戻す
                                hot.setDataAtCell(rowIndex, columnIndex, ''); // 元のデータに戻す
                                hot.setCellMeta(rowIndex, columnIndex, 'className', ''); // 背景色を元に戻す
                            } else {
                                hot.setDataAtCell(rowIndex, columnIndex, '-');
                                hot.setCellMeta(rowIndex, columnIndex, 'className', 'bg-change');
                            }
                        }
                    }
                }
                hot.resumeRender();
                });
            }
        }
    }

    // 選択されたセルの色を変更するための処理を実行
    useEffect(() => {
        changeSelectedCellsColor();
    }, [hotRef]);


    // 日付のリファレンスの配列を作成する (Firestoreに講師のシフト情報を保存するときに使う)
    const getClassDateRangeRefArray = async () => {
        const classDateRangeRef = collection(db, 'date');
        const querySnapshot = await getDocs(classDateRangeRef);
        const docsClassDateData = querySnapshot.docs.map((doc: any) => {
            return doc.ref.path;
        });
        return docsClassDateData;
    }


    // 時間帯のリファレンスの配列を作成する (Firestoreに講師のシフト情報を保存するときに使う)
    const getClassTimeRefArray = async () => {
        const classTimeRef = collection(db, 'time');
        const classTimeQuerySnapshot = await getDocs(classTimeRef);
        const classTimeDocsData = classTimeQuerySnapshot.docs.map((doc: any) => {
            return doc.ref.path;
        });
        return classTimeDocsData;
    }

    // シフトデータのセル座標を講習期間と時限のリファレンスに変更する
    const convertShiftDataToReferencedFormat = async (
        ShiftArray: any,
        classDateRangeRefArray: any,
        classTimeRefArray: any
    ) => {
        const referencedFormatShiftArray: any = [];
        ShiftArray.map((doc: any)=>{
            referencedFormatShiftArray.push({
                id: `${doc.row as number}_${doc.col as number}`,
                class_time : classTimeRefArray[doc.col as number - 1],
                class_date_range : classDateRangeRefArray[doc.row as number - 1],
            });
        });
        console.log(referencedFormatShiftArray);
        return referencedFormatShiftArray;
    }

    // シフトデータを登録する前に既存のシフトデータを削除する処理 (これをやらないと選択を解除したシフトが消えない)
    const beforeShiftDataDelete = async (staffId: any) => {
        // ドキュメントがすでに存在するかどうかを判別する
        const teacherDocRef = doc(db, "staff", staffId);
        const teacherDocSnap = await getDoc(teacherDocRef);
        // ドキュメントが存在していた場合はシフトデータを削除する (ドキュメントが存在していない場合にこれをやるとエラーになる)
        if (teacherDocSnap.exists()) {
            await updateDoc(doc(db, "staff", staffId), {
                shift : deleteField(),
            });
        }
    }

    // 実際にシフトデータを登録する処理
    const storeTeacherShiftData = async (staffId: any, ShiftArray: any) => {
        for (let i = 0; i < ShiftArray.length; i++) {
            // 文字列になっているパスからドキュメントのリファレンスを取得する
            const classTimeRefPath = ShiftArray[i].class_time;
            const classDateRangeRefPath = ShiftArray[i].class_date_range;
            const classTimeRefPathSegments = classTimeRefPath.split('/');
            const classDateRangeRefPathSegments = classDateRangeRefPath.split('/');
            // リファレンスのパスからIDを取得して、そのIDからドキュメントのリファレンスを取得する
            const classTimeRef = doc(db, "time", classTimeRefPathSegments[1]);
            const classDateRangeRef = doc(db, "date", classDateRangeRefPathSegments[1]);
            // updateDocを使うとfor文の繰り返しごとに1つのフィールドにシフトが上書きされるのでsetDocとmergeオプションを使う
            await setDoc(doc(db, "staff", staffId), {
                shift : {
                    [ShiftArray[i].id] : {
                        class_time : classTimeRef,
                        class_date_range : classDateRangeRef,
                    },
                }
            }, { merge: true });
        }
    }

    // Firestoreに講師のシフトを保存するための関数
    const saveShift = async (ShiftArray: any) => {
        // 講習期間と時限のリファレンスを配列として取得
        const classDateRangeRefArray = await getClassDateRangeRefArray();
        const classTimeRefArray = await getClassTimeRefArray();
        // セルの座標を講習期間と時限のリファレンスに変更する
        const referencedFormatShiftArray =
            await convertShiftDataToReferencedFormat(ShiftArray, classDateRangeRefArray, classTimeRefArray);
        // 講師のドキュメントが存在していた場合、選択が解除されたセルのシフト情報を削除するために一旦Shiftフィールドを消してから再度登録する
        await beforeShiftDataDelete(modalId);
        // サブコレクションteachersにリファレンス形式になったシフト情報を保存する
        await storeTeacherShiftData(modalId, referencedFormatShiftArray).then(()=>{
            console.log("Document successfully updated!");
        });
    }

    // 選択されて色が変わっているセルの情報を取得してFirestoreに保存する
    const saveSelectedCellsToFirestore = () => {
        const selectedCells = [];
        if (hotRef.current) {
            const hotInstance = hotRef.current.hotInstance;
            if (hotInstance) {
                const rowCount = hotInstance.countRows();
                const colCount = hotInstance.countCols();
                for (let row = 0; row < rowCount; row++) {
                    for (let col = 0; col < colCount; col++) {
                        const cellValue = hotInstance.getDataAtCell(row, col);
                        // 選択されているセルは値が-になっているかどうかで見分ける
                        if (cellValue === '-') {
                            selectedCells.push({ row, col });
                        }
                    }
                }
            }
        }
        saveShift(selectedCells);
    };



    return (
        <Box>
            <Box>
                {modalId}
            </Box>
            <HotTable
                ref={hotRef}
                data={shiftTableData}
                width="auto"
                colWidths={100}
                rowHeights={23}
                rowHeaders={false}
                colHeaders={false}
                outsideClickDeselects={false}
                selectionMode="multiple"
                licenseKey="non-commercial-and-evaluation"
                readOnly
                cells={(row: number, column: number, prop: string | number)=>{
                    const cellProperties: any = {};
                    // 初期値として選択されているセルを選択すると他のセルの色が消える問題を解決するために、セルの値が-になっているセルだけ色を変更する
                    if (shiftTableData[row][column] === '-') {
                        cellProperties.className = 'bg-change';
                    }



                    return cellProperties;
                }}
            />
            <Box>
                <Button onClick={saveSelectedCellsToFirestore} m={4}>シフトを保存する</Button>
            </Box>
        </Box>
    );
}

export default ShiftInput;

