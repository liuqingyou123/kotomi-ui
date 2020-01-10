import React from 'react'
import { Table as AntTable , Button, Form, Divider, Icon } from 'antd'
import {TableSize, ColumnProps as AntColumnProps, TableRowSelection,TableEventListeners } from 'antd/lib/table/interface'
import { WrappedFormUtils, ValidationRule } from 'antd/lib/form/Form';
import { EditableContext,EditableCell } from './EditableCell'

import './Table.less'

export interface ColumnProps<T> extends AntColumnProps<T>{
    // 列是否只读，默认为false
    readOnly?: boolean
    // 行编辑的单元类型
    inputType?: JSX.Element
    // 校验规则
    rules?: ValidationRule[]
}

type Props<T> = {

    /**
     * 列的信息 
     * $operating 用来修改数据的默认操作列
     * $state     当前编辑状态
     */
    columns:ColumnProps<T> []

    /**
     * 装载数据的方法
     * @param page 当前第几页信息
     * @param pageSize 当前页面的大小
     * @param param 当前请求数据的参数
     * @param sorter 当前数据查询的参数
     */
    loadData({page, pageSize,param,sorter}:{page:number,pageSize:number,param?:any,sorter?:TableSorter}):Promise<{dataSource:T[],total:number}>
    
    /**
     * 表格显示大小
     */
    theme?: TableSize 
    
    /**
     * 默认页面显示大小，默认为300条
     */
    defaultPageSize?: number
    
    /**
     * 表格高度
     */
    height?: boolean | number | string
    
    /**
     * 表格的宽度
     */
    width?: boolean | number | string
    
    /**
     * 数据中默认的key,默认字段为id
     */
    rowKey: string
    
    /**
     * 是否可以选中行，默认为不显示选择框
     */
    rowSelection?: 'single'| 'multiple' | undefined
    
    /**
     *  当前表格的事件
     */
    event?: TableEvent<T>
    
    // 无需传入，Form.create 进行创建即可
    form?: WrappedFormUtils

    // 是否可编辑表格 true表示可编辑，false表示不可编辑
    isEditing: boolean

    // 当前单元格编辑类型，cell表示单元格编辑，row表示行编辑
    editingType?: 'cell'| 'row'

    // 当前表格样式
    style?: React.CSSProperties;
    
    // 扩展的表格信息
    refExt?: (self: Table<T>)=> void

}


// 数据状态
class DataSourceState<T>{
    update: Array<T> = []
    delete: Array<T> = []
    create: Array<T> = []
}

type State<T> = {
    dataSource:T[]
    total: number
    loading: boolean
    param: any
    page: number
    pageSize: number
    sorter?: TableSorter
    editingKey?: string
    dataSourceState: DataSourceState<T>
}

export type TableSorter = {
    // 字段名称
    name: string
    // 排序方式
    order: string
}

export type TableEvent<T> = {

    /**
     * 当前表格的选择状态
     * @param selectedRowKeys 当前所有变化的Row的key
     * @param selected        变化状态true表示选中，false表示取消
     */
    onSelect?:(selectedRowKeys:string[],selected: boolean) => void

    /**
     * 当前行的事件
     * @param record 当前行的数据
     * @param index  当前行的索引
     */
    onRow?:(record: T, index: number) => TableEventListeners;

    /**
     * 保存数据
     * @param record  要操作的数据
     * @param type    当前数据变更的类型，删除更新和创建
     * @returns 如果成功则返回true，否则返回false
     */
    onSave?:(record: T, type: 'DELETE' | 'UPDATE' | 'CREATE' ) => Promise<boolean>
}

/**
 *  和后台交互的表格对象，并且可编辑
 */
class Table<T> extends React.Component<Props<T>,State<T>>{
    
    state = {
        dataSource:[],
        total: 0,
        loading: false,
        param:{},
        page: 1,
        pageSize: 0,
        sorter: undefined,
        editingKey: undefined,
        dataSourceState:new DataSourceState<T>()
    }

    static defaultProps = {
        theme: 'small',
        defaultPageSize: 300,
        width: '100%',
        height: 400,
        rowKey: 'id',
        editingType: 'cell',
        isEditing: false,
        event: {
            onSelect:()=>{},
            onRow:()=>{},
            onSave:()=>{}
        }
    }

    componentDidMount(){
        this.requestLoadData({
            page: 1,
            pageSize: this.props.defaultPageSize!
        })
        if(this.props.refExt){
            this.props.refExt(this)
        }
    }

    /**
     * 判断当前行的数据是否可以编辑
     * @param record 当前行的数据
     * @returns true表示可编辑 false表示不可编辑
     */
    protected isEditing(record : T): boolean{
        const { rowKey } = this.props
        const { editingKey } = this.state
        return record[rowKey] === editingKey
    }


    /**
     * 判断当前列是否只读，true表示只读，false表示可编辑
     * @param column 
     */
    protected isReadOnly(column:ColumnProps<T>){
        const {isEditing} = this.props
        if(column.readOnly){
            return true
        }
        if(!isEditing){
            return true
        }
        return false
    }
    /**
     * 获得当前列的信息
     */
    protected getColumns():ColumnProps<T>[]{
        const self = this 
        const  {
            columns,
            event,
            editingType,
            form,
            rowKey
        } = this.props
        const { 
            dataSourceState,
            dataSource
         } = this.state
        columns.forEach((column)=>{
            if(column.dataIndex === '$operating'){
                column.render=(text:string, record: T)=>{
                    const editor = (
                        <>
                            <Button
                                icon='edit'
                                type='link'
                                disabled={this.state.editingKey !== undefined && !this.isEditing(record)}
                                onClick={()=>{
                                    this.setState({
                                        editingKey: record[rowKey]
                                    })
                                }}
                            />
                            <Divider type='vertical' />
                            <Button
                                icon='delete'
                                type='link'
                                disabled={this.state.editingKey !== undefined && !this.isEditing(record)}
                                onClick={()=>{
                                    this.setState({
                                        editingKey: record[rowKey]
                                    })
                                }}
                            />
                        </>
                    )
                    
                    return self.isEditing(record) ? (
                        <>
                            <Button
                                icon='check'
                                type='link'
                                onClick={()=>{
                                    const onSave = event!.onSave 
                                    if(onSave && form !== undefined){
                                        form.validateFields((err, values) => {
                                            if(!err){
                                                onSave(values,'CREATE').then((respState)=>{
                                                    if(respState !== false){
                                                        this.setState({
                                                            editingKey: undefined
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    } 
                                  
                                }}
                            />
                            <Divider type='vertical' />
                            <Button
                                icon='undo'
                                type='link'
                                onClick={()=>{
                                    this.setState({
                                        editingKey: undefined
                                    })
                                }}
                            />
                        </>
                    ) : editor 
                }
                column.width = 80
            }else if(column.dataIndex === '$state'){
                column.render=(text:string, record: T)=>{
                    if(
                        dataSourceState.update.filter((data)=>{ 
                            return data[rowKey] === record[rowKey]
                        }).length > 0 ||
                        dataSourceState.create.filter((data)=>{
                            return  data[rowKey] === record[rowKey]
                        }).length > 0
                    ){
                        return (
                            <>
                               <Icon type="edit" />
                            </>
                        )
                    }
                    return (
                        <>
                        </>
                    )
                }
                column.width = 14
                    
            }else{
                
                if(column.ellipsis === undefined){
                    column.ellipsis = true
                }
                if(column.sortDirections === undefined){
                    column.sortDirections = ['descend', 'ascend']
                    column.sorter = true
                }

                // 如果属性设置为可编辑，则渲染可编辑的表格，默认为不可编辑
                column.onCell = (record: T ,rowIndex: number)=>{
                    return {
                        column,
                        record,
                        rowIndex,
                        editing: this.isEditing(record),
                        editingType: editingType,
                        readOnly: this.isReadOnly(column),
                        onSave: async (values: T) => {
                            const newData: T[] = [...dataSource];
                            newData.forEach((data,dataIndex)=>{
                                if(data[rowKey] === values[rowKey]){
                                    newData.splice(dataIndex, 1, {
                                        ...values
                                    });
            
                                }
                            })
                            if(dataSourceState.update.filter((data)=> data[rowKey] === values[rowKey]).length > 0){
                                dataSourceState.update.forEach((element,elementIndex) => {
                                    if(element[rowKey] === values[rowKey]){
                                        dataSourceState.update.splice(elementIndex,1,{
                                            ...values
                                        })
                                    }
                                });
                            }else{
                                dataSourceState.update.push(values)
                            }
                            self.setState({ dataSource: newData });
                            return true
                        }
                    }
                }
                // 给一个宽度的默认值
                if(column.width == null){
                    column.width = 120
                }
            }
           
        })
        return this.props.columns
    }


    /**
     * 获取当前表格的编辑状态
     * @returns DataSourceState
     */
    public getDataSourceState(){
        return this.state.dataSourceState
    }

    /**
     * 获取当前表格数据的数据源
     */
    protected getDataSource():T[]{
        return this.state.dataSource
    }

    /**
     * 用来进行表格的数据刷新，如果无参数，就是重新请求后台
     * @param param 刷新表格的参数
     */
    public refresh(param?: any){
        this.requestLoadData({
            page:this.state.page,
            pageSize:this.state.pageSize!,
            param:{
                ...this.state.param,
                ...(param || {})
            },
            sorter:this.state.sorter
        })
    }

    /**
     * 向后台请求数据
     * @param page     当前页面
     * @param pageSize 当前页面显示的数据条数
     */
    protected requestLoadData({page, pageSize,param,sorter}:{page:number,pageSize:number,param?:any,sorter?:TableSorter}){
        this.setState({
            loading: true
        })

        // 如果请求失败，则不做任何操作
        this.props.loadData({page, pageSize,param,sorter}).then(({dataSource,total})=>{
            this.setState({
                dataSource,
                total
            })
        }).finally(()=>{
            this.setState({
                loading: false
            })
        })
    }

    protected getRowSelection():TableRowSelection<T> | undefined{
        const self = this
        const onSelect =  self.props.event!.onSelect!
        let rowProps:TableRowSelection<T> = {
            type: 'checkbox',
            columnWidth: 16,
            onSelect:(record: T, selected: boolean)=>{
                onSelect(record[self.props.rowKey],selected)
            },
            onSelectAll:(selected: boolean, _selectedRows: T[], changeRows: T[])=>{
                onSelect(changeRows.map((record)=> record[self.props.rowKey]),selected)
            },
        }
        switch(this.props.rowSelection){
            case 'single':
                rowProps.type = 'radio'
                return rowProps
            case 'multiple':
                rowProps.type = 'checkbox'
                return rowProps
            default:
                return undefined
        }
    }


    render(){
        return (
            <EditableContext.Provider value = {{
                form: this.props.form
            }}>
                <AntTable
                    style={this.props.style}
                    rowKey={this.props.rowKey}
                    columns={this.getColumns()}
                    rowClassName={() => 'kotomi-components-table-row'}
                    components={{
                        body: {
                            cell: EditableCell,
                        }
                    }}
                    dataSource={this.getDataSource()}
                    loading={{
                        indicator:<Icon
                                    type='loading'
                                    style={{ fontSize: 24 }}
                                    spin
                                />,
                        spinning:this.state.loading
                    }}
                    pagination={{
                        size:'small' ,
                        defaultPageSize:this.props.defaultPageSize,
                        total:this.state.total,
                    }}
                    onChange={(pagination, filters, sorter)=>{
                        this.requestLoadData({
                            page:pagination.current!,
                            pageSize:pagination.pageSize!,
                            param: this.state.param,
                            sorter:{
                                name: sorter.field,
                                order: sorter.order
                            } as TableSorter
                        })
                    }}
                    rowSelection = {this.getRowSelection()}
                    onRow={(record: T, index: number)=>{
                       // 如果当前行处于不可编辑状态，则不点击click事件
                       if(this.state.editingKey == undefined){
                            const onRow = this.props.event!.onRow
                            return onRow === undefined ? {} : onRow(record,index) 
                       }
                       // 否则不相应事件
                       return {}
                    }}
                    size='small' 
                    scroll={{
                        x: this.props.width,
                        y: this.props.height
                    }}
                />
            </EditableContext.Provider>
        )
    }
}

// @ts-ignore
const EditableFormTable = Form.create()(Table);

export { EditableFormTable as Table };